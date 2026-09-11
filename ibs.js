/**
 * isimbulamadimscript (IBS) v2.0
 * Özellikler: Hata Toleranslı Lexer/Parser (Auto-Correct) + addBranch Kural Motoru
 */
class IBS {
    constructor() {
        this.globals = new Map();
        this.branches = new Map();
        this.setupDefaults();
    }

    setupDefaults() {
        this.bind("print", (...args) => console.log("[IBS Çıktı]:", ...args));

        // .ibs dili içerisinden direkt çağrılabilen akıllı addBranch fonksiyonu
        this.bind("addBranch", (condition, trueAction, falseAction) => {
            if (condition) {
                if (typeof trueAction === 'function') trueAction();
                else if (trueAction) console.log("[IBS Branch]:", trueAction);
                return true;
            } else if (falseAction) {
                if (typeof falseAction === 'function') falseAction();
                else console.log("[IBS Branch]:", falseAction);
                return false;
            }
            return false;
        });
    }

    bind(name, fn) { this.globals.set(name, fn); }
    setGlobal(name, val) { this.globals.set(name, val); }
    getGlobal(name) { return this.globals.get(name); }

    // =========================================================
    // JS TARAFI İÇİN GELİŞMİŞ addBranch SİSTEMİ
    // (İç içe if-else yazma derdini kökten çözen Kural Listesi)
    // =========================================================
    addBranch(branchName, rules) {
        // rules: [ { when: "can < 20", then: () => ... }, { default: () => ... } ]
        this.branches.set(branchName, rules);
    }

    executeBranch(branchName) {
        const rules = this.branches.get(branchName);
        if (!rules) throw new Error(`[IBS]: '${branchName}' adında bir branch bulunamadı.`);

        for (const rule of rules) {
            if (rule.when) {
                const isTrue = this.run(rule.when);
                if (isTrue) {
                    if (typeof rule.then === 'function') rule.then();
                    else this.run(rule.then);
                    return;
                }
            } else if (rule.default) {
                if (typeof rule.default === 'function') rule.default();
                else this.run(rule.default);
                return;
            }
        }
    }

    run(code) {
        const tokens = this._tokenize(code);
        const ast = this._parse(tokens);
        return this._evaluate(ast, this.globals);
    }

    // ================= LEXER (HATA AFFEDEN) =================
    _tokenize(src) {
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            let c = src[i];
            if (/\s/.test(c)) { i++; continue; }
            if (c === '/' && src[i + 1] === '/') {
                while (i < src.length && src[i] !== '\n') i++;
                continue;
            }
            if (/[0-9]/.test(c)) {
                let num = "";
                while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
                tokens.push({ type: 'NUM', val: parseFloat(num) });
                continue;
            }
            if (/[a-zA-Z_]/.test(c)) {
                let id = "";
                while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) id += src[i++];
                if (['let', 'if', 'else'].includes(id)) tokens.push({ type: id.toUpperCase(), val: id });
                else tokens.push({ type: 'ID', val: id });
                continue;
            }
            if (c === '"') {
                let str = ""; i++;
                while (i < src.length && src[i] !== '"') str += src[i++];
                i++;
                tokens.push({ type: 'STR', val: str });
                continue;
            }
            const two = src.slice(i, i + 2);
            if (['==', '!=', '<=', '>='].includes(two)) {
                tokens.push({ type: 'OP', val: two }); i += 2; continue;
            }
            if ('+-*/<>=;(),{}'.includes(c)) {
                tokens.push({ type: c, val: c }); i++; continue;
            }
            i++; // Bilinmeyen karakterde patlama, atla
        }
        tokens.push({ type: 'EOF' });
        return tokens;
    }

    // ================= PARSER (OTO-DÜZELTMELİ IF) =================
    _parse(tokens) {
        let pos = 0;
        const peek = () => tokens[pos] || { type: 'EOF' };
        const previous = () => tokens[pos - 1];
        
        const consume = (expected) => {
            const t = peek();
            if (expected && t.type !== expected && t.val !== expected) {
                // OTO-DÜZELTME: Noktalı virgülü unuttuysa oyunu çökertme, otomatik ekle!
                if (expected === ';') {
                    console.warn(`[IBS Oto-Düzeltme]: Satır sonundaki ';' eksikti, otomatik tamamlandı.`);
                    return { type: ';', val: ';' };
                }
                throw new Error(`[IBS Sözdizim Hatası]: '${expected}' bekleniyordu, '${t.val || t.type}' geldi.`);
            }
            pos++;
            return t;
        };

        const parsePrimary = () => {
            const t = peek();
            if (t.type === 'NUM' || t.type === 'STR') { pos++; return { type: 'Literal', value: t.val }; }
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
                    return { type: 'Call', callee: t.val, args };
                }
                return { type: 'Var', name: t.val };
            }
            if (t.type === '(') {
                pos++;
                const expr = parseExpr();
                consume(')');
                return expr;
            }
            return { type: 'Literal', value: 0 };
        };

        const parseBinary = (minPrec = 0) => {
            const precs = { '<': 1, '>': 1, '==': 1, '!=': 1, '<=': 1, '>=': 1, '+': 2, '-': 2, '*': 3, '/': 3 };
            let left = parsePrimary();
            while (true) {
                const op = peek().val;
                const prec = precs[op];
                if (!prec || prec < minPrec) break;
                pos++;
                const right = parseBinary(prec + 1);
                left = { type: 'Binary', op, left, right };
            }
            return left;
        };

        const parseExpr = () => parseBinary(0);

        const parseStmt = () => {
            if (peek().type === 'LET') {
                pos++;
                const name = consume('ID').val;
                consume('=');
                const init = parseExpr();
                consume(';');
                return { type: 'VarDecl', name, init };
            }

            // =========================================================
            // OTO-DÜZELTMELİ IF PARSER (SENİN İSTEDİĞİN SİHİR!)
            // =========================================================
            if (peek().type === 'IF') {
                pos++;
                let hasParen = false;

                // 1. KULLANICI '(' KOYMAYI UNUTTUYSA OTO-DÜZELT!
                if (peek().type === '(') {
                    hasParen = true;
                    pos++;
                } else {
                    console.warn(`[IBS Oto-Düzeltme]: 'if' koşulunda '(' unutulmuş, otomatik düzeltildi!`);
                }

                const test = parseExpr();

                // 2. KULLANICI ')' KOYMAYI UNUTTUYSA VEYA KOYDUYSA YÖNET
                if (hasParen) {
                    if (peek().type === ')') {
                        pos++;
                    } else {
                        console.warn(`[IBS Oto-Düzeltme]: 'if' koşulu kapatma parantezi ')' unutulmuş, tamamlandı!`);
                    }
                }

                // Süslü parantez kontrolü
                let hasBrace = false;
                if (peek().type === '{') {
                    hasBrace = true;
                    pos++;
                }

                const consequent = [];
                if (hasBrace) {
                    while (peek().type !== '}' && peek().type !== 'EOF') consequent.push(parseStmt());
                    consume('}');
                } else {
                    // Tek satırlık if durumu
                    consequent.push(parseStmt());
                }

                let alternate = null;
                if (peek().type === 'ELSE') {
                    pos++;
                    let elseBrace = false;
                    if (peek().type === '{') { elseBrace = true; pos++; }
                    alternate = [];
                    if (elseBrace) {
                        while (peek().type !== '}' && peek().type !== 'EOF') alternate.push(parseStmt());
                        consume('}');
                    } else {
                        alternate.push(parseStmt());
                    }
                }
                return { type: 'If', test, consequent, alternate };
            }

            if (peek().type === 'ID' && tokens[pos + 1]?.type === '=') {
                const name = consume('ID').val;
                consume('=');
                const val = parseExpr();
                consume(';');
                return { type: 'Assign', name, val };
            }

            const expr = parseExpr();
            consume(';');
            return { type: 'ExprStmt', expr };
        };

        const body = [];
        while (peek().type !== 'EOF') body.push(parseStmt());
        return { type: 'Program', body };
    }

    // ================= EVALUATOR =================
    _evaluate(node, env) {
        if (!node) return null;
        switch (node.type) {
            case 'Program':
                let res;
                for (const stmt of node.body) res = this._evaluate(stmt, env);
                return res;
            case 'Literal': return node.value;
            case 'Var':
                return env.has(node.name) ? env.get(node.name) : 0;
            case 'VarDecl':
            case 'Assign':
                const val = this._evaluate(node.init || node.val, env);
                env.set(node.name, val);
                return val;
            case 'Binary':
                const l = this._evaluate(node.left, env);
                const r = this._evaluate(node.right, env);
                if (node.op === '+') return l + r;
                if (node.op === '-') return l - r;
                if (node.op === '*') return l * r;
                if (node.op === '/') return l / r;
                if (node.op === '<') return l < r;
                if (node.op === '>') return l > r;
                if (node.op === '==') return l === r;
                if (node.op === '!=') return l !== r;
                if (node.op === '<=') return l <= r;
                if (node.op === '>=') return l >= r;
                break;
            case 'Call':
                const fn = env.get(node.callee);
                if (typeof fn === 'function') {
                    const args = node.args.map(a => this._evaluate(a, env));
                    return fn(...args);
                }
                break;
            case 'If':
                if (this._evaluate(node.test, env)) {
                    for (const s of node.consequent) this._evaluate(s, env);
                } else if (node.alternate) {
                    for (const s of node.alternate) this._evaluate(s, env);
                }
                break;
            case 'ExprStmt':
                return this._evaluate(node.expr, env);
        }
    }
}

if (typeof module !== 'undefined') module.exports = IBS;
