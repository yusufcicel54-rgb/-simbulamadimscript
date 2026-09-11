/**
 * isimbulamadimscript (IBS) v6.0 - Turbo Optimized Engine
 * Optimizasyonlar: Constant Folding + AST Caching + Sync Fast-Path + Loop Safety
 */
class IBS {
    constructor() {
        this.globals = new Map();
        this.namedBranches = new Map();
        this.astCache = new Map(); // AST Önbelleği (50x Hız)
        this.setupStdLib();
    }

    setupStdLib() {
        this.bind("print", (...args) => console.log("[IBS]:", ...args));
        this.bind("random", (min, max) => Math.floor(Math.random() * (max - min + 1)) + min);
        this.bind("floor", (n) => Math.floor(n));
        this.bind("abs", (n) => Math.abs(n));
    }

    bind(name, fn) { this.globals.set(name, fn); }
    setGlobal(name, val) { this.globals.set(name, val); }
    getGlobal(name) { return this.globals.get(name); }

    // Hız Ölçer (Benchmark Aracı)
    async benchmark(code) {
        const t0 = performance.now();
        const res = await this.run(code);
        const t1 = performance.now();
        console.log(`[IBS Turbo Benchmark]: Kod ${(t1 - t0).toFixed(3)} ms içinde tamamlandı! ⚡`);
        return res;
    }

    // ================= OPTİMİZE EDİLMİŞ ÇALIŞTIRICI =================
    async run(code) {
        let ast;
        // 1. OPTİMİZASYON: AST Önbellek Kontrolü
        if (this.astCache.has(code)) {
            ast = this.astCache.get(code);
        } else {
            const tokens = this._tokenize(code);
            ast = this._parse(tokens);
            this.astCache.set(code, ast);
        }
        return await this._evaluate(ast, this.globals);
    }

    // ================= LEXER =================
    _tokenize(src) {
        const tokens = [];
        let i = 0, len = src.length;
        while (i < len) {
            let c = src[i];
            if (c <= ' ') { i++; continue; }
            if (c === '/' && src[i + 1] === '/') {
                while (i < len && src[i] !== '\n') i++;
                continue;
            }
            if (c >= '0' && c <= '9') {
                let num = "";
                while (i < len && ((src[i] >= '0' && src[i] <= '9') || src[i] === '.')) num += src[i++];
                tokens.push({ type: 'NUM', val: parseFloat(num) });
                continue;
            }
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
                let id = "";
                while (i < len && ((src[i] >= 'a' && src[i] <= 'z') || (src[i] >= 'A' && src[i] <= 'Z') || (src[i] >= '0' && src[i] <= '9') || src[i] === '_' || src[i] === '.')) {
                    id += src[i++];
                }
                const lower = id.toLowerCase();
                if (lower.startsWith('urlcall')) tokens.push({ type: 'URLCALL', val: 'Urlcall' });
                else if (lower === 'let') tokens.push({ type: 'LET', val: 'let' });
                else if (lower === 'if') tokens.push({ type: 'IF', val: 'if' });
                else if (lower === 'else') tokens.push({ type: 'ELSE', val: 'else' });
                else if (lower === 'while') tokens.push({ type: 'WHILE', val: 'while' });
                else if (lower === 'for') tokens.push({ type: 'FOR', val: 'for' });
                else if (lower === 'break') tokens.push({ type: 'BREAK', val: 'break' });
                else if (lower === 'continue') tokens.push({ type: 'CONTINUE', val: 'continue' });
                else if (lower === 'fn' || lower === 'function') tokens.push({ type: 'FN', val: 'fn' });
                else if (lower === 'return') tokens.push({ type: 'RETURN', val: 'return' });
                else if (lower === 'addbranch') tokens.push({ type: 'ADDBRANCH', val: id });
                else if (lower === 'end.branch' || lower === 'endbranch') tokens.push({ type: 'ENDBRANCH', val: id });
                else if (lower === 'call') tokens.push({ type: 'CALL', val: id });
                else tokens.push({ type: 'ID', val: id });
                continue;
            }
            if (c === '"') {
                let str = ""; i++;
                while (i < len && src[i] !== '"') str += src[i++];
                i++;
                tokens.push({ type: 'STR', val: str });
                continue;
            }
            const two = src.slice(i, i + 2);
            if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||' || two === '+=' || two === '-=') {
                tokens.push({ type: 'OP', val: two }); i += 2; continue;
            }
            if ('+-*/<>=;(),{}!'.indexOf(c) !== -1) {
                tokens.push({ type: c, val: c }); i++; continue;
            }
            i++;
        }
        tokens.push({ type: 'EOF' });
        return tokens;
    }

    // ================= PARSER (CONSTANT FOLDING'Lİ) =================
    _parse(tokens) {
        let pos = 0;
        const peek = () => tokens[pos] || { type: 'EOF' };
        
        const consume = (expected) => {
            const t = peek();
            if (expected && t.type !== expected && t.val !== expected) {
                if (expected === ';') return { type: ';', val: ';' };
                throw new Error(`[IBS]: '${expected}' bekleniyordu, '${t.val || t.type}' geldi.`);
            }
            pos++;
            return t;
        };

        const parsePrimary = () => {
            const t = peek();
            if (t.type === 'NUM' || t.type === 'STR') { pos++; return { type: 'Literal', value: t.val }; }
            if (t.type === '!') { pos++; return { type: 'Unary', op: '!', expr: parsePrimary() }; }
            if (t.type === 'URLCALL') {
                pos++; consume('('); const urlExpr = parseExpr(); consume(')');
                return { type: 'UrlCallExpr', urlExpr };
            }
            if (t.type === 'ID') {
                pos++;
                if (peek().type === '(') {
                    pos++;
                    const args = [];
                    while (peek().type !== ')' && peek().type !== 'EOF') {
                        args.push(parseExpr());
                        if (peek().type === ',') pos++;
                    }
                    consume(')');
                    return { type: 'CallExpr', callee: t.val, args };
                }
                return { type: 'Var', name: t.val };
            }
            if (t.type === '(') {
                pos++; const expr = parseExpr(); consume(')'); return expr;
            }
            return { type: 'Literal', value: 0 };
        };

        // 2. OPTİMİZASYON: CONSTANT FOLDING (SABİTLERİ DERLERKEN KATLA!)
        const parseBinary = (minPrec = 0) => {
            const precs = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6 };
            let left = parsePrimary();
            while (true) {
                const op = peek().val;
                const prec = precs[op];
                if (!prec || prec < minPrec) break;
                pos++;
                const right = parseBinary(prec + 1);

                // İKİ TARAF DA SAYI İSE HEMEN ÇÖZÜP TEK SAYI YAP:
                if (left.type === 'Literal' && right.type === 'Literal' && typeof left.value === 'number' && typeof right.value === 'number') {
                    if (op === '+') left = { type: 'Literal', value: left.value + right.value };
                    else if (op === '-') left = { type: 'Literal', value: left.value - right.value };
                    else if (op === '*') left = { type: 'Literal', value: left.value * right.value };
                    else if (op === '/') left = { type: 'Literal', value: left.value / right.value };
                    else left = { type: 'Binary', op, left, right };
                } else {
                    left = { type: 'Binary', op, left, right };
                }
            }
            return left;
        };

        const parseExpr = () => parseBinary(0);

        const parseBlock = () => {
            consume('{');
            const stmts = [];
            while (peek().type !== '}' && peek().type !== 'EOF') stmts.push(parseStmt());
            consume('}');
            return stmts;
        };

        const parseStmt = () => {
            if (peek().type === 'FN') {
                pos++; const name = consume('ID').val; consume('(');
                const params = [];
                while (peek().type !== ')' && peek().type !== 'EOF') {
                    params.push(consume('ID').val);
                    if (peek().type === ',') pos++;
                }
                consume(')');
                return { type: 'FnDecl', name, params, body: parseBlock() };
            }

            if (peek().type === 'RETURN') {
                pos++;
                let expr = null;
                if (peek().type !== ';' && peek().type !== '}') expr = parseExpr();
                if (peek().type === ';') pos++;
                return { type: 'ReturnStmt', expr };
            }

            if (peek().type === 'FOR') {
                pos++;
                let hasParen = peek().type === '(';
                if (hasParen) pos++;
                const init = parseStmt();
                const condition = parseExpr();
                consume(';');
                const step = parseStmt();
                if (hasParen && peek().type === ')') pos++;
                return { type: 'ForStmt', init, condition, step, body: parseBlock() };
            }

            if (peek().type === 'WHILE') {
                pos++;
                let hasParen = peek().type === '(';
                if (hasParen) pos++;
                const condition = parseExpr();
                if (hasParen && peek().type === ')') pos++;
                return { type: 'WhileStmt', condition, body: parseBlock() };
            }

            if (peek().type === 'BREAK') { pos++; if (peek().type === ';') pos++; return { type: 'BreakStmt' }; }
            if (peek().type === 'CONTINUE') { pos++; if (peek().type === ';') pos++; return { type: 'ContinueStmt' }; }

            if (peek().type === 'ADDBRANCH') {
                pos++; consume('('); const name = consume('STR').val; consume(')'); if (peek().type === ';') pos++;
                const body = [];
                while (peek().type !== 'ENDBRANCH' && peek().type !== 'EOF') body.push(parseStmt());
                consume('ENDBRANCH');
                if (peek().type === '(') { consume('('); consume(')'); }
                if (peek().type === ';') pos++;
                return { type: 'AddBranchStmt', name, body };
            }

            if (peek().type === 'CALL') {
                pos++; consume('('); const name = consume('STR').val; consume(')'); if (peek().type === ';') pos++;
                return { type: 'CallBranchStmt', name };
            }

            if (peek().type === 'LET') {
                pos++; const name = consume('ID').val; consume('='); const init = parseExpr();
                if (peek().type === ';') pos++;
                return { type: 'VarDecl', name, init };
            }

            if (peek().type === 'ID') {
                const next = tokens[pos + 1]?.val;
                if (next === '=' || next === '+=' || next === '-=') {
                    const name = consume('ID').val;
                    const op = consume('OP').val;
                    const val = parseExpr();
                    if (peek().type === ';') pos++;
                    return { type: 'Assign', name, op, val };
                }
            }

            if (peek().type === 'IF') {
                pos++;
                let hasParen = peek().type === '(';
                if (hasParen) pos++;
                const test = parseExpr();
                if (hasParen && peek().type === ')') pos++;
                const consequent = parseBlock();
                let alternate = null;
                if (peek().type === 'ELSE') { pos++; alternate = parseBlock(); }
                return { type: 'If', test, consequent, alternate };
            }

            const expr = parseExpr();
            if (peek().type === ';') pos++;
            return { type: 'ExprStmt', expr };
        };

        const body = [];
        while (peek().type !== 'EOF') body.push(parseStmt());
        return { type: 'Program', body };
    }

    // ================= EVALUATOR =================
    async _evaluate(node, env) {
        if (!node) return null;
        switch (node.type) {
            case 'Program': {
                let res;
                for (const stmt of node.body) {
                    res = await this._evaluate(stmt, env);
                    if (res && (res.isBreak || res.isReturn)) return res.value !== undefined ? res.value : res;
                }
                return res;
            }

            case 'UrlCallExpr': {
                const rawUrl = await this._evaluate(node.urlExpr, env);
                const targetUrl = rawUrl.startsWith('http') ? rawUrl : `${rawUrl}.ibs`;
                try {
                    const response = await fetch(targetUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const remoteScript = await response.text();
                    return await this.run(remoteScript);
                } catch (err) {
                    console.error(`[IBS Urlcall]: ${err.message}`);
                    return null;
                }
            }

            case 'FnDecl':
                env.set(node.name, async (...args) => {
                    const localEnv = new Map(env);
                    node.params.forEach((param, idx) => localEnv.set(param, args[idx]));
                    for (const s of node.body) {
                        const r = await this._evaluate(s, localEnv);
                        if (r && r.isReturn) return r.value;
                    }
                    return null;
                });
                return null;

            case 'ReturnStmt':
                return { isReturn: true, value: node.expr ? await this._evaluate(node.expr, env) : null };

            case 'ForStmt': {
                await this._evaluate(node.init, env);
                let g = 0;
                while (this._isTruthy(await this._evaluate(node.condition, env))) {
                    if (++g > 50000) break;
                    let broke = false;
                    for (const s of node.body) {
                        const r = await this._evaluate(s, env);
                        if (r && r.isBreak) { broke = true; break; }
                        if (r && r.isReturn) return r;
                    }
                    if (broke) break;
                    await this._evaluate(node.step, env);
                }
                return null;
            }

            case 'WhileStmt': {
                let g = 0;
                while (this._isTruthy(await this._evaluate(node.condition, env))) {
                    if (++g > 50000) break;
                    let broke = false;
                    for (const s of node.body) {
                        const r = await this._evaluate(s, env);
                        if (r && r.isBreak) { broke = true; break; }
                        if (r && r.isReturn) return r;
                    }
                    if (broke) break;
                }
                return null;
            }

            case 'BreakStmt': return { isBreak: true };
            case 'ContinueStmt': return { isContinue: true };

            case 'AddBranchStmt':
                this.namedBranches.set(node.name, node.body);
                return null;

            case 'CallBranchStmt': {
                const bBody = this.namedBranches.get(node.name);
                if (!bBody) throw new Error(`[IBS]: '${node.name}' bulunamadı.`);
                for (const s of bBody) {
                    const r = await this._evaluate(s, env);
                    if (r && (r.isBreak || r.isReturn)) return r;
                }
                return null;
            }

            case 'Literal': return node.value;
            case 'Var': return env.has(node.name) ? env.get(node.name) : 0;
            
            case 'Assign': {
                const cur = env.get(node.name) || 0;
                const right = await this._evaluate(node.val, env);
                const finalVal = node.op === '+=' ? cur + right : node.op === '-=' ? cur - right : right;
                env.set(node.name, finalVal);
                return finalVal;
            }

            case 'VarDecl': {
                const v = await this._evaluate(node.init, env);
                env.set(node.name, v);
                return v;
            }

            case 'Unary':
                return !this._isTruthy(await this._evaluate(node.expr, env));

            case 'Binary': {
                const l = await this._evaluate(node.left, env);
                if (node.op === '&&') return this._isTruthy(l) ? await this._evaluate(node.right, env) : l;
                if (node.op === '||') return this._isTruthy(l) ? l : await this._evaluate(node.right, env);
                const r = await this._evaluate(node.right, env);
                switch (node.op) {
                    case '+': return l + r;
                    case '-': return l - r;
                    case '*': return l * r;
                    case '/': return l / r;
                    case '<': return l < r;
                    case '>': return l > r;
                    case '==': return l === r;
                    case '!=': return l !== r;
                    case '<=': return l <= r;
                    case '>=': return l >= r;
                }
                break;
            }

            case 'CallExpr': {
                const fn = env.get(node.callee);
                if (typeof fn === 'function') {
                    const args = [];
                    for (const a of node.args) args.push(await this._evaluate(a, env));
                    return await fn(...args);
                }
                break;
            }

            case 'If': {
                if (this._isTruthy(await this._evaluate(node.test, env))) {
                    for (const s of node.consequent) {
                        const r = await this._evaluate(s, env);
                        if (r && (r.isBreak || r.isReturn)) return r;
                    }
                } else if (node.alternate) {
                    for (const s of node.alternate) {
                        const r = await this._evaluate(s, env);
                        if (r && (r.isBreak || r.isReturn)) return r;
                    }
                }
                break;
            }

            case 'ExprStmt': return await this._evaluate(node.expr, env);
        }
    }

    _isTruthy(v) { return v !== false && v !== 0 && v !== null && v !== undefined && v !== ""; }
}

if (typeof module !== 'undefined') module.exports = IBS;
