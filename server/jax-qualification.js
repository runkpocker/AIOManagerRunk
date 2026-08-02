import Database from 'better-sqlite3'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const DEFAULT_TARGET_PASSES = 10
const DEFAULT_DAILY_LIMIT = 2
const DEFAULT_TIME_ZONE = 'America/Edmonton'
const CANDIDATE_NAME = process.env.JAX_CANDIDATE_NAME || 'Jackson'
const PROGRAM_CODE = process.env.JAX_PROGRAM_CODE || 'BAXTER-07'

function boundedInt(value, fallback, min, max) {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function safeJson(value, fallback = []) {
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        return parsed ?? fallback
    } catch {
        return fallback
    }
}

function jsonString(value, fallback = []) {
    try {
        return JSON.stringify(value ?? fallback)
    } catch {
        return JSON.stringify(fallback)
    }
}

function localDateFor(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
}

function validAttemptId(value) {
    return typeof value === 'string' && value.length >= 8 && value.length <= 100 && /^[a-zA-Z0-9._:-]+$/.test(value)
}

function securePinMatches(provided, configured) {
    if (!configured || typeof provided !== 'string') return false
    const supplied = Buffer.from(provided)
    const expected = Buffer.from(configured)
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)
}

function accuracyFor(row) {
    if (!row || !row.answered) return null
    return Math.round((row.correct / row.answered) * 100)
}

export default async function jaxQualificationPlugin(fastify, options = {}) {
    const dataDir = options.dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'data')
    const dbPath = process.env.JAX_DB_PATH || path.join(dataDir, 'jax-qualification.db')
    const targetPasses = boundedInt(process.env.JAX_TARGET_PASSES, DEFAULT_TARGET_PASSES, 1, 100)
    const dailyLimit = boundedInt(process.env.JAX_MAX_COUNTED_PASSES_PER_DAY, DEFAULT_DAILY_LIMIT, 0, 20)
    const timeZone = process.env.JAX_TIME_ZONE || DEFAULT_TIME_ZONE
    const parentPin = process.env.JAX_PARENT_PIN || ''

    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    const database = new Database(dbPath)
    database.pragma('journal_mode = WAL')
    database.pragma('synchronous = NORMAL')
    database.pragma('foreign_keys = ON')
    database.exec(`
        CREATE TABLE IF NOT EXISTS jax_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jax_attempts (
            attempt_id TEXT PRIMARY KEY,
            cycle INTEGER NOT NULL,
            student TEXT NOT NULL,
            mode TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'app',
            exam_length INTEGER NOT NULL DEFAULT 0,
            answered INTEGER NOT NULL DEFAULT 0,
            correct INTEGER NOT NULL DEFAULT 0,
            wrong INTEGER NOT NULL DEFAULT 0,
            percent INTEGER NOT NULL DEFAULT 0,
            passed INTEGER NOT NULL DEFAULT 0,
            counted INTEGER NOT NULL DEFAULT 0,
            count_reason TEXT NOT NULL DEFAULT 'not_eligible',
            local_date TEXT NOT NULL,
            client_started_at TEXT,
            client_completed_at TEXT,
            server_completed_at TEXT NOT NULL,
            duration_seconds INTEGER,
            weak_topics_json TEXT NOT NULL DEFAULT '[]',
            missed_questions_json TEXT NOT NULL DEFAULT '[]',
            question_results_json TEXT NOT NULL DEFAULT '[]',
            invalidated INTEGER NOT NULL DEFAULT 0,
            invalidated_at TEXT,
            invalidated_reason TEXT,
            note TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_jax_attempts_cycle_date
            ON jax_attempts(cycle, local_date, counted, invalidated);
        CREATE INDEX IF NOT EXISTS idx_jax_attempts_cycle_time
            ON jax_attempts(cycle, server_completed_at DESC);
    `)

    const metadataGet = database.prepare('SELECT value FROM jax_metadata WHERE key = ?')
    const metadataSet = database.prepare(`
        INSERT INTO jax_metadata(key, value) VALUES(?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)

    const getMetaInt = (key, fallback) => {
        const row = metadataGet.get(key)
        const parsed = row ? Number.parseInt(row.value, 10) : Number.NaN
        return Number.isFinite(parsed) ? parsed : fallback
    }
    const setMetaInt = (key, value) => metadataSet.run(key, String(value))

    if (!metadataGet.get('current_cycle')) setMetaInt('current_cycle', 1)
    if (!metadataGet.get('weak_reset_version')) setMetaInt('weak_reset_version', 0)
    if (!metadataGet.get('min_difficulty')) setMetaInt('min_difficulty', 1)

    const selectAttempt = database.prepare('SELECT * FROM jax_attempts WHERE attempt_id = ?')
    const insertAttempt = database.prepare(`
        INSERT INTO jax_attempts (
            attempt_id, cycle, student, mode, source, exam_length, answered,
            correct, wrong, percent, passed, counted, count_reason, local_date,
            client_started_at, client_completed_at, server_completed_at,
            duration_seconds, weak_topics_json, missed_questions_json,
            question_results_json, note
        ) VALUES (
            @attempt_id, @cycle, @student, @mode, @source, @exam_length, @answered,
            @correct, @wrong, @percent, @passed, @counted, @count_reason, @local_date,
            @client_started_at, @client_completed_at, @server_completed_at,
            @duration_seconds, @weak_topics_json, @missed_questions_json,
            @question_results_json, @note
        )
    `)

    function currentCycle() {
        return getMetaInt('current_cycle', 1)
    }

    function rowToRun(row) {
        const accuracy = accuracyFor(row)
        return {
            attemptId: row.attempt_id,
            mode: row.mode,
            source: row.source,
            score: row.correct,
            answered: row.answered,
            wrong: row.wrong,
            accuracy,
            passed: Boolean(row.passed),
            counted: Boolean(row.counted) && !Boolean(row.invalidated),
            countReason: row.count_reason,
            invalidated: Boolean(row.invalidated),
            invalidatedReason: row.invalidated_reason || null,
            note: row.note || null,
            completedAt: row.server_completed_at,
            localDate: row.local_date,
            weakTopics: safeJson(row.weak_topics_json, [])
        }
    }

    function getRows(cycle = currentCycle()) {
        return database.prepare(`
            SELECT * FROM jax_attempts
            WHERE cycle = ?
            ORDER BY server_completed_at DESC, rowid DESC
        `).all(cycle)
    }

    function buildSummary(cycle = currentCycle()) {
        const rows = getRows(cycle)
        const validRows = rows.filter(row => !row.invalidated)
        const fullTests = validRows.filter(row => row.mode === 'test' && row.source === 'app')
        const countedRows = validRows.filter(row => row.counted)
        const passedTests = fullTests.filter(row => row.passed)
        const qualifyingPasses = countedRows.length
        const accuracies = fullTests.map(accuracyFor).filter(Number.isFinite)
        const passingAccuracies = passedTests.map(accuracyFor).filter(Number.isFinite)

        let currentStreak = 0
        for (const row of fullTests) {
            if (row.passed) currentStreak += 1
            else break
        }

        const topicTotals = new Map()
        for (const row of fullTests) {
            const results = safeJson(row.question_results_json, [])
            for (const result of results) {
                if (!result || typeof result.topic !== 'string') continue
                const entry = topicTotals.get(result.topic) || { topic: result.topic, correct: 0, total: 0 }
                entry.total += 1
                if (result.correct) entry.correct += 1
                topicTotals.set(result.topic, entry)
            }
        }
        const topicPerformance = [...topicTotals.values()]
            .map(entry => ({
                ...entry,
                accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0
            }))
            .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.topic.localeCompare(b.topic))

        return {
            candidate: {
                name: CANDIDATE_NAME,
                programCode: PROGRAM_CODE
            },
            status: qualifyingPasses >= targetPasses ? 'AUTHORIZED' : 'IN_TRAINING',
            targetPasses,
            qualifyingPasses,
            remainingPasses: Math.max(0, targetPasses - qualifyingPasses),
            dailyCreditLimit: dailyLimit,
            totalFullTests: fullTests.length,
            validatedFullTests: passedTests.length,
            rejectedFullTests: fullTests.length - passedTests.length,
            passRate: fullTests.length ? Math.round((passedTests.length / fullTests.length) * 100) : 0,
            currentStreak,
            bestAccuracy: accuracies.length ? Math.max(...accuracies) : 0,
            averagePassingAccuracy: passingAccuracies.length
                ? Math.round(passingAccuracies.reduce((sum, value) => sum + value, 0) / passingAccuracies.length)
                : 0,
            weakResetVersion: getMetaInt('weak_reset_version', 0),
            minDifficulty: getMetaInt('min_difficulty', 1),
            cycle,
            topicPerformance,
            recentRuns: rows.slice(0, 8).map(rowToRun)
        }
    }

    function requireParentPin(request, reply) {
        if (!parentPin) {
            reply.code(503).send({ error: 'Parent controls are not configured. Set JAX_PARENT_PIN in Railway.' })
            return false
        }
        const provided = request.body?.parentPin || request.headers['x-jax-parent-pin']
        if (!securePinMatches(provided, parentPin)) {
            reply.code(403).send({ error: 'Incorrect parent PIN.' })
            return false
        }
        return true
    }

    fastify.get('/api/jax/qualification', async () => buildSummary())

    fastify.get('/api/jax/history', async () => {
        const summary = buildSummary()
        return {
            ...summary,
            runs: getRows().map(rowToRun)
        }
    })

    fastify.post('/api/jax/results', async (request, reply) => {
        const body = request.body || {}
        if (!validAttemptId(body.attemptId)) {
            reply.code(400)
            return { error: 'A valid attemptId is required.' }
        }

        const existing = selectAttempt.get(body.attemptId)
        if (existing) {
            const summary = buildSummary()
            return {
                saved: true,
                duplicate: true,
                countsTowardGoal: Boolean(existing.counted) && !Boolean(existing.invalidated),
                countReason: existing.count_reason,
                attempt: rowToRun(existing),
                qualification: summary
            }
        }

        const mode = ['test', 'practice', 'weak'].includes(body.mode) ? body.mode : null
        if (!mode) {
            reply.code(400)
            return { error: 'mode must be test, practice, or weak.' }
        }

        const examLength = boundedInt(body.examLength, mode === 'test' ? 30 : 0, 0, 500)
        const answered = boundedInt(body.answered ?? body.total, 0, 0, 500)
        const correct = boundedInt(body.correct ?? body.score, 0, 0, 500)
        const wrong = boundedInt(body.wrong, Math.max(0, answered - correct), 0, 500)
        if (correct + wrong !== answered || answered > examLength || correct > answered) {
            reply.code(400)
            return { error: 'Result totals are inconsistent.' }
        }
        if (mode === 'test' && examLength !== 30) {
            reply.code(400)
            return { error: 'A qualifying Full Test must be configured for 30 questions.' }
        }

        const serverNow = new Date()
        const completedAt = serverNow.toISOString()
        const localDate = localDateFor(serverNow, timeZone)
        const activeCycle = currentCycle()
        const cycleHint = boundedInt(body.programCycle, activeCycle, 1, activeCycle)
        const cycle = cycleHint
        const staleCycle = cycle !== activeCycle
        const passed = mode === 'test'
            ? correct >= 25 && wrong <= 5
            : answered > 0 && Math.round((correct / answered) * 100) >= 83
        const percent = answered ? Math.round((correct / answered) * 100) : 0

        let counted = 0
        let countReason = 'not_full_test'
        if (mode === 'test') {
            if (staleCycle) {
                countReason = 'stale_cycle'
            } else if (!passed) {
                countReason = 'not_passed'
            } else {
                const progress = buildSummary(cycle).qualifyingPasses
                if (progress >= targetPasses) {
                    countReason = 'program_complete'
                } else {
                    const countedToday = database.prepare(`
                        SELECT COUNT(*) AS count
                        FROM jax_attempts
                        WHERE cycle = ? AND local_date = ? AND counted = 1 AND invalidated = 0 AND source = 'app'
                    `).get(cycle, localDate).count
                    if (dailyLimit > 0 && countedToday >= dailyLimit) {
                        countReason = 'daily_limit_reached'
                    } else {
                        counted = 1
                        countReason = 'credited'
                    }
                }
            }
        }

        let durationSeconds = null
        const startMs = Date.parse(body.startedAt)
        const endMs = Date.parse(body.completedAt)
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
            durationSeconds = Math.min(24 * 60 * 60, Math.round((endMs - startMs) / 1000))
        }

        const row = {
            attempt_id: body.attemptId,
            cycle,
            student: typeof body.student === 'string' && body.student.trim() ? body.student.trim().slice(0, 80) : CANDIDATE_NAME,
            mode,
            source: 'app',
            exam_length: examLength,
            answered,
            correct,
            wrong,
            percent,
            passed: passed ? 1 : 0,
            counted,
            count_reason: countReason,
            local_date: localDate,
            client_started_at: typeof body.startedAt === 'string' ? body.startedAt : null,
            client_completed_at: typeof body.completedAt === 'string' ? body.completedAt : null,
            server_completed_at: completedAt,
            duration_seconds: durationSeconds,
            weak_topics_json: jsonString(Array.isArray(body.weakTopics) ? body.weakTopics.slice(0, 30) : []),
            missed_questions_json: jsonString(Array.isArray(body.missedQuestions) ? body.missedQuestions.slice(0, 100) : []),
            question_results_json: jsonString(Array.isArray(body.questionResults) ? body.questionResults.slice(0, 500) : []),
            note: null
        }

        insertAttempt.run(row)
        const stored = selectAttempt.get(body.attemptId)
        const summary = buildSummary(activeCycle)
        fastify.log.info({
            category: 'Jax',
            attemptId: body.attemptId,
            passed,
            counted: Boolean(counted),
            progress: `${summary.qualifyingPasses}/${summary.targetPasses}`
        }, 'Jackson test result stored')

        return {
            saved: true,
            duplicate: false,
            countsTowardGoal: Boolean(counted),
            countReason,
            attempt: rowToRun(stored),
            qualification: summary
        }
    })

    fastify.post('/api/jax/admin/reset', async (request, reply) => {
        if (!requireParentPin(request, reply)) return
        const nextCycle = currentCycle() + 1
        setMetaInt('current_cycle', nextCycle)
        fastify.log.warn({ category: 'Jax', cycle: nextCycle }, 'Jackson qualification progress reset')
        return { success: true, qualification: buildSummary(nextCycle) }
    })

    fastify.post('/api/jax/admin/credit', async (request, reply) => {
        if (!requireParentPin(request, reply)) return
        const cycle = currentCycle()
        const summaryBefore = buildSummary(cycle)
        if (summaryBefore.qualifyingPasses >= targetPasses) {
            reply.code(409)
            return { error: 'Qualification target is already complete.', qualification: summaryBefore }
        }
        const now = new Date()
        const attemptId = `manual-${crypto.randomUUID()}`
        insertAttempt.run({
            attempt_id: attemptId,
            cycle,
            student: CANDIDATE_NAME,
            mode: 'manual',
            source: 'manual',
            exam_length: 0,
            answered: 0,
            correct: 0,
            wrong: 0,
            percent: 0,
            passed: 1,
            counted: 1,
            count_reason: 'manual_credit',
            local_date: localDateFor(now, timeZone),
            client_started_at: null,
            client_completed_at: null,
            server_completed_at: now.toISOString(),
            duration_seconds: null,
            weak_topics_json: '[]',
            missed_questions_json: '[]',
            question_results_json: '[]',
            note: typeof request.body?.note === 'string' ? request.body.note.trim().slice(0, 300) : 'Parent-issued credit'
        })
        return { success: true, qualification: buildSummary(cycle), attemptId }
    })

    fastify.post('/api/jax/admin/invalidate', async (request, reply) => {
        if (!requireParentPin(request, reply)) return
        const attemptId = request.body?.attemptId
        const row = typeof attemptId === 'string' ? selectAttempt.get(attemptId) : null
        if (!row || row.cycle !== currentCycle()) {
            reply.code(404)
            return { error: 'Run not found in the active qualification cycle.' }
        }
        if (row.invalidated) {
            return { success: true, qualification: buildSummary(), attempt: rowToRun(row) }
        }
        database.prepare(`
            UPDATE jax_attempts
            SET invalidated = 1, invalidated_at = ?, invalidated_reason = ?
            WHERE attempt_id = ?
        `).run(
            new Date().toISOString(),
            typeof request.body?.reason === 'string' ? request.body.reason.trim().slice(0, 300) : 'Invalidated by parent',
            attemptId
        )
        return { success: true, qualification: buildSummary(), attempt: rowToRun(selectAttempt.get(attemptId)) }
    })

    fastify.post('/api/jax/admin/reset-weak-spots', async (request, reply) => {
        if (!requireParentPin(request, reply)) return
        const nextVersion = getMetaInt('weak_reset_version', 0) + 1
        setMetaInt('weak_reset_version', nextVersion)
        return { success: true, weakResetVersion: nextVersion, qualification: buildSummary() }
    })

    fastify.post('/api/jax/admin/difficulty', async (request, reply) => {
        if (!requireParentPin(request, reply)) return
        const value = boundedInt(request.body?.minDifficulty, getMetaInt('min_difficulty', 1), 1, 3)
        setMetaInt('min_difficulty', value)
        fastify.log.info({ category: 'Jax', minDifficulty: value }, 'Jax test difficulty updated')
        return { success: true, minDifficulty: value, qualification: buildSummary() }
    })

    fastify.addHook('onClose', async () => {
        try {
            database.pragma('wal_checkpoint(TRUNCATE)')
        } catch {
            // Best effort only.
        }
        database.close()
    })

    fastify.log.info({ category: 'Jax' }, `BAXTER-07 qualification database ready at ${dbPath}`)
}
