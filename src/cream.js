/* Copyright (c) 2014 Jonathan Karlsson */

//"use strict";

var counts = {
    "assert": 0,
    "evaluate": 0,
    "compile": 0,
    "compileIf": 0,
    "compileDefine": 0,
    "compileLambda": 0,
    "expandMacro": 0,
    "apply": 0,
    "evalTC": 0,
    "extendEnv": 0,
    "makeLambda": 0,
    "lookupVariableValue": 0,
    "compileJS": 0,
    "evalJS": 0
}


var assert = function(condition, message) {
    //counts.assert++;
    if (!condition) {
        throw message || "Assertion failed";
    }
}

var start = Date.now();

var jseval = eval;
var evaluate = function(expr, env) {
    var res = expr(env);
    while (res !== null && res.name === "Thunk") {
        res = res();
    }
    return res;
}

var compile = function(expr) {
    //counts["compile"]++;
    if (isSelfeval(expr)) {
        return function Compiled(_) {
            return expr;
        }
    } else if (isVariable(expr)) {
        return function Compiled(env) {
            return lookupVariableValue(expr, env);
        }
    } else if (isIf(expr)) {
        return compileIf(expr);
    } else if (isDefine(expr)) {
        return compileDefine(expr);
    } else if (isLambda(expr)) {
        return compileLambda(expr);
    } else if (isBegin(expr)) {
        var exprs = tail(expr)
        return compileSequence(exprs);
    } else if (isList(expr)) {
        var list = tail(expr);
        return compileList(list);
    } else if (isQuote(expr)) {
        return compileQuote(expr);
    } else if (isJS(expr)) {
        return compileJS(expr);
    } else if (isDefMacro(expr)) {
        return compileDefMacro(expr);
    } else if (isEval(expr)) {
        return compileEval(expr);
    } else if (isApplication(expr)) {
        return compileApplication(expr);
    }
    return expr;
}

var compileIf = function(expr) {
    //counts["compileIf"]++;

    var predicate = compile(cadr(expr));
    var caseT = compile(caddr(expr));
    var caseF = compile(head(tail(tail(tail(expr)))));

    return function Compiled(env) {

        var ePred = evaluate(predicate, env);

        if (ePred == "#t" || ePred === true) {

            return caseT(env);
        } else if (ePred == "#f" || ePred === false) {

            return caseF(env);
        } else {
            throw ("ERROR: Unexpected value of predicate: " + ePred);
        }
    }
}

var compileDefine = function(expr) {
    var name = cadr(expr);

    var body = compile(caddr(expr));

    if (typeof name === "object") {
        var args = cdr(name);
        name = car(name);
        if (car(args) === ".") {
            args = cadr(args);
        }
        var lambdaMaker = makeLambda(args, body);
        return function Compiled(env) {
            var lambda = lambdaMaker(env)
            if (env[name] === undefined) {

                env[name] = lambda;
                return lambda;
            } else {
                throw ("ERROR: Name already exists: " + name);
            }
        }
    } else if (typeof name === "string") {

        return function Compiled(env) {
            if (env[name] === undefined) {
                var evald = evaluate(body, env)
                env[name] = evald;
                return evald;
            } else {
                throw ("ERROR: Name already exists: " + name);
            }
        }
    } else {
        throw ("ERROR: Name cannot be of type: " + typeof name);
    }
};
var compileLambda = function(expr) {
    var args = lambdaArgs(expr);
    var body = compile(lambdaBody(expr));
    var lambdaMaker = makeLambda(args, body);
    return function Compiled(env) {
        return lambdaMaker(env);
    }
};

var compileSequence = function(seq) {

    var exprs = seq.map(compile);
    var length = exprs.length;
    return function Compiled(env) {
        //console.log(exprs)

        for (var i = 0; i < (length - 1); i++) {
            if (typeof exprs[i] === "function" && exprs[i].name === "Compiled") {
                exprs[i](env);
            } else {
                evaluate(exprs[i], env);
            }
        }
        if (typeof exprs[length - 1] === "function" && exprs[length - 1].name === "Compiled") {
            return exprs[length - 1](env);
        } else {
            return compile(exprs[length - 1])(env)
        }
    }
}

var evaluateSequence = function(exprs, env) {
    var length = exprs.length;
    //console.log(exprs)
    for (var i = 0; i < (length - 1); i++) {
        //if (typeof exprs[i] === "function" && exprs[i].name === "Compiled") {
        exprs[i](env);
        //} else {
        //    ev(exprs[i], env);
        //}
    }
    if (typeof exprs[length - 1] === "function" && exprs[length - 1].name === "Compiled") {
        return exprs[length - 1](env);
    } else {
        return compile(exprs[length - 1])(env)
    }
}

var compileList = function(list) {
    if (0 === list.length) return function Compiled() {
        return [];
    };
    list = list.map(compile);
    return function Compiled(env) {
        return list.map(function(list) {
            return evaluate(list, env);
        })
    }
}


var compileQuote = function(expr) {
    var text = cadr(expr);
    return function Compiled(_) {
        return text;
    }
}

var compileJS = function(expr) {
    //counts["compileJS"]++;
    var isList = false;
    var js = head(tail(expr));
    var args = cadr(js);
    if ((Object.prototype.toString.call(args) !== '[object Array]')) {
        isList = true;
        args = cdr(js);
    }

    var jsEvald = jseval(head(js));

    if (isQuote(args)) {
        args = cadr(args);

        var res = jsEvald.apply(this, [args]);
        //console.log(res)
        return function Compiled() {
            // counts["evalJS"]++;

            return res
        }
    } else {
        if (isList) {
            var compiledArgs = compileList(args);
            return function Compiled(env) {
                //counts["evalJS"]++;

                return jsEvald.apply(this, compiledArgs(env));
            }
        } else {
            return function Compiled(env) {
                //   counts["evalJS"]++;

                return jsEvald.apply(this, [evaluate(args, env)]);
            }
        }

    }
}

var compileDefMacro = function(expr) {
    var name = cadr(expr);
    var exp = compile(caddr(expr));
    return function Compiled(env) {
        if (env[name] === undefined) {
            var expander = evaluate(exp, env);
            var macroObject = makeMacro(expander);
            env[name] = macroObject;

            return macroObject;
        } else {
            throw ("ERROR: Name already exists: " + name);
        }
    }
}
var makeMacro = function(expander) {
    return {
        type: "macro object",
        expander: expander
    }
}

var compileEval = function(expr) {
    if (typeof expr === "string") {
        expr = parse(expr);
    }
    var quoted = head(tail(expr));

    if (head(quoted) === "quote") {
        quoted = compile(head(tail(quoted)));

        return function Compiled(env) {
            return quoted(env);
        }
    } else {
        return function Compiled(env) {
            return compileEval("(eval " + evaluate(quoted, env) + ")", env);
        }
    }
}

var compileApplication = function(expr) {
    var operands = getOperands(expr);
    var compiledOperator = compile(getOperator(expr));
    var compiledOperands = compileList(operands);
    var expanded = null;
    var environment = null;

    return function Compiled(env) {

        return function Thunk() {
            var operator = evaluate(compiledOperator, env);

            if (isMacro(operator)) {

                if (expanded === null) {
                    //console.log("Expanding macro " + getOperator(expr))
                    expanded = expandMacro(operator, operands, env);

                } else {
                    //console.log("Using expanded macro " + getOperator(expr))
                }
                if (environment === null) {
                    environment = extendEnvironment(procParams(operator["expander"]));
                }

                var expandedEnv = environment(head(operands))(env);
                return expanded(expandedEnv);
            } else if (isPrimitiveProc(operator)) {
                return prim[operator](compiledOperands(env));

            } else {

                return apply(operator, compiledOperands(env));
            }
        }
    }
}


var expandMacro = function(macro, args, env) {
    //counts["expandMacro"]++;
    var expanded = apply(macro["expander"], args)

    while (expanded !== null && expanded.name === "Thunk") {
        expanded = expanded();
    }
    //console.log(expanded)
    if (Object.prototype.toString.call(expanded) === '[object Array]') {
        expanded = compile(expanded);
    }

    return expanded;
}



var apply = function(proc, args) {
    //counts["apply"]++;

    if ((args.length === 1 || args.length === 0)) {

        return evaluateSequence([proc.body], extendEnv(procParams(proc), head(args), procEnv(proc)));

    } else if (args.length === proc.numargs) {
        var vars = [procParams(proc)].concat(proc.body[1]);
        return evaluateSequence([proc.body[2]], extendEnv(vars, args, procEnv(proc)));

    } else if (proc.numargs === Infinity) {
        return evaluateSequence([proc.body], extendEnv(procParams(proc), args, procEnv(proc)));

    } else {

        return apply(evaluate(proc.body, extendEnv(procParams(proc), head(args), procEnv(proc))), tail(args));

    }

    console.log(proc)
    throw ("ERROR: Unknown procedure " + proc);

}

var extendEnv = function(vars, vals, parent) {
    //counts["extendEnv"]++;
    var env = {};

    if (vars === undefined && vals === undefined) {


    } else if (vals === undefined) {
        throw ("ERROR: no arguments supplied");

    } else if ((Object.prototype.toString.call(vars) === '[object Array]') &&
        (Object.prototype.toString.call(vals) === '[object Array]') &&
        vars.length === vals.length) {

        var length = vars.length;
        for (var i = 0; i < length; i++) {
            env[vars[i]] = vals[i];
        }

    } else if (typeof vars === "string" && vals !== undefined) {

        env[vars] = vals;

    }

    env.parent = parent;
    return env;

}

var extendEnvironment = function(vars) {
    var env = {};
    if (vars === undefined) {
        return function(vals) {
            assert(vals === undefined, "ERROR: Too many arguments");
            return function(parent) {
                env.parent = parent;
                return env;
            };
        }
    } else if (Object.prototype.toString.call(vars) === '[object Array]') {
        var varsLength = vars.length;
        return function(vals) {
            assert(vals !== undefined, "ERROR: No arguments supplied");
            assert((Object.prototype.toString.call(vals) === '[object Array]'), "ERROR: Expected list");
            assert(vals.length === varsLength, "ERROR: Wrong number of arguments");

            return function(parent) {
                for (var i = 0; i < varsLength; i++) {
                    env[vars[i]] = vals[i];
                }
                env.parent = parent;
                return env;
            };
        }
        //array
    } else if (typeof vars === "string") {
        return function(vals) {
            assert(vals !== undefined, "ERROR: No argument supplied");
            env[vars] = vals;
            return function(parent) {
                env.parent = parent;
                return env;
            };
        }
    }
}


var makeLambda = function(args, body) {
    //counts["makeLambda"]++;
    var lambda;
    if (typeof args === "string") {
        lambda = {
            type: "function object",
            args: args,
            body: body,
            numargs: Infinity
        };
    } else if (tail(args).length === 0) {
        lambda = {
            type: "function object",
            args: head(args),
            body: body,
            numargs: 1
        };

    } else {
        lambda = {
            type: "function object",
            args: head(args),
            numargs: tail(args).length + 1
        };
        lambda.body = ["lambda"].concat([tail(args)], [body]);
    }
    return function(env) {
        lambda.parent = env;
        return lambda;
    }
}

var procBody = function(proc) {
    return proc["body"];
}
var procParams = function(proc) {
    return proc["args"];
}
var procEnv = function(proc) {
    return proc["parent"];
}

var getOperator = function(expr) {
    return head(expr);
}
var getOperands = function(expr) {
    return tail(expr);
}

var isPrimitiveProc = function(proc) {
    return (prim[head(proc)] !== undefined);
}
var isCompoundProc = function(proc) {
    return (proc.type === "function object");
}
var isMacro = function(proc) {
    return (proc.type === "macro object");
}
var isAtom = function(expr) {
    return (typeof expr === "string" && head(expr) === ":");
}
var isBool = function(expr) {
    return (typeof expr === "string" && (expr === "true" || expr === "#t" || expr === "false" || expr === "#f"));
}
var isLogic = function(expr) {
    return (typeof expr === "string" && (expr === "true" || expr === "#t" || expr === "false" || expr === "#f"));
}
var isVariable = function(expr) {
    return (typeof expr === "string");
}
var isQuote = function(expr) {
    return (typeof expr === "object" && head(expr) === "quote");
}
var isEval = function(expr) {
    return (typeof expr === "object" && head(expr) === "eval");
}
var isList = function(expr) {
    return (typeof expr === "object" && head(expr) === "list");
}
var isDefine = function(expr) {
    return (typeof expr === "object" && head(expr) === 'define' && expr.length === 3);
}
var isDefMacro = function(expr) {
    return (typeof expr === "object" && head(expr) === 'defmacro' && expr.length === 3);
}
var isLambda = function(expr) {
    return (typeof expr === "object" && (head(expr) === 'lambda' || head(expr) === 'λ') && expr.length === 3);
}
var isNumber = function(expr) {
    return (typeof expr === "number");
}
var isIf = function(expr) {
    return (typeof expr === "object" && head(expr) === 'if' && expr.length === 4);
}
var isApplication = function(expr) {
    return (typeof expr === "object");
}
var isBegin = function(expr) {
    return (typeof expr === "object" && head(expr) === 'begin');
}
var isSelfeval = function(expr) {
    return (isNumber(expr) || isBool(expr));
}
var isJS = function(expr) {
    return (typeof expr === "object" && head(expr) === 'js');
}


var lookupVariableValue = function(name, env) {
    //counts["lookupVariableValue"]++;

    var value = env[name];
    var parent = env["parent"]
    while (value === undefined && parent !== null) {

        value = parent[name];
        parent = parent["parent"]
    }

    if (value !== undefined) {
        return value;
    }

    throw ("ERROR: Unbound variable " + name);
}

var lambdaArgs = function(expr) {
    return cadr(expr);
}
var lambdaBody = function(expr) {
    return caddr(expr);
}

var prim = {
    "+": function(args) {
        var sum = 0;
        for (var i = args.length; i--;) {
            sum += args[i];
        }
        return sum;
    },
    "-": function(args) {
        return args.reduce(function(previousValue, currentValue, index, array) {
            assert((typeof previousValue === "number"), "ERROR: Not a number " + previousValue);
            assert((typeof currentValue === "number"), "ERROR: Not a number " + currentValue);

            return previousValue - currentValue;
        });
    },
    "*": function(args) {
        var prod = 0;
        for (var i = args.length; i--;) {
            prod *= args[i];
        }
        return prod;
    },
    "/": function(args) {
        return args.reduce(function(previousValue, currentValue, index, array) {
            assert((typeof previousValue === "number"), "ERROR: Not a number " + previousValue);
            assert((typeof currentValue === "number"), "ERROR: Not a number " + currentValue);
            return previousValue / currentValue;
        });
    },
    "=": function(args) {
        var res = args.reduce(function(previousValue, currentValue, index, array) {
            return (previousValue === false) ? false : (args[0] === currentValue);
        });
        return (res === true || res === "#t") ? "#t" : "#f";
    }
}

global = {
    parent: null,
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "=": "=",
    "null": null
};

var tokenize = function(input) {
    return input
        .replace(/\'\(\)/g, "(quote ())") // '() -> (quote ())
    .replace(/\'\((.+?)\)/g, "(quote ($1))") // '(hello) -> (quote (hello))
    .replace(/\'([a-zA-Z0-9\-\+\*\/]+)/g, '(quote $1)') // 'hello -> (quote hello)
    .replace(/\(/g, ' [ ')
        .replace(/\"/g, '\\\"')
        .replace(/\)/g, ' ] ')
        .trim()
        .split(/\s+/);
};

var parse = function(input) {
    var e = JSON.parse(tokenize(input).map(function(token) {
        var f = parseFloat(token);
        if (isNaN(f)) {
            if (token === '[' || token === "]") {
                return token;
            } else {
                return "\"" + token + "\"";
            }
        } else {
            return f;
        }
    }).toString().replace(/\[\,/g, "[").replace(/\,\]/g, "]"));
    return e;
}

var head = function(lst) {
    return lst[0];
}
var tail = function(lst) {
    return lst.slice(1);
}
var car = function(lst) {
    return lst[0];
}
var cdr = function(lst) {
    return lst.slice(1);
}
var cadr = function(lst) {
    return (lst[1] === undefined) ? [] : lst[1];
}
var caddr = function(lst) {
    return (lst[2] === undefined) ? [] : lst[2];
}
var cadddr = function(lst) {
    return (lst[3] === undefined) ? [] : lst[3];
}
var log = function(msg) {
    console.log("LOG:")
    console.log(msg);
    return msg;
}
var alrt = function(msg) {
    alert(msg);
    return msg;
}
var mod = function(a, b) {
    return a % b;
}
var less = function(a, b) {
    return a < b ? "#t" : "#f";
}
var more = function(a, b) {
    return a > b ? "#t" : "#f";
}
var moreOrEqual = function(a, b) {
    return a >= b ? "#t" : "#f";
}
var lessOrEqual = function(a, b) {
    return a <= b ? "#t" : "#f";
}
var and = function(a, b) {
    return ((a === "#t") || (a && (a !== "#f"))) && ((b === "#t") || (b && (b !== "#f"))) ? "#t" : "#f";
}
var or = function(a, b) {
    return ((a === "#t") || (a && (a !== "#f"))) || ((b === "#t") || (b && (b !== "#f"))) ? "#t" : "#f";
}
var cons = function(a, b) {
    return [a].concat(b);
}
var append = function(a, b) {
    return a.concat(b);
}
var isEqual = function(a, b) {
    return a === b ? "#t" : "#f";
}
var isEmpty = function(lst) {
    assert((Object.prototype.toString.call(lst) === '[object Array]'), "ERROR: Not a list " + lst);
    return (lst.length === 0) ? "#t" : "#f";
}

var require = function(name) {
    var url;
    if (name.match(/^http/) !== null) {
        url = name;
    } else {
        url = '/cream/' + name + '.cr';
    }
    $.get(url, function(data) {
        data = data.replace(/\;.*/g, "").replace(/^\s*[\r\n]/gm, "")
        printEvaluated(evaluate(compile(parse(data)), global));
    }).fail(function(e) {
        print("<span style='color:#d44'>></span> File Not Found!")
    });

    return "Loading..."
}

var numberwang = function(s) {
    var dist = [100, 10, 2, 50, 30, 3, 30, 10, 3, 700, 2.8, 1000, 1000, 300, 150, 90, 150, 90, 300, 1000, 100000, 100000, 100000000, 100000000];
    var index = Math.floor(Math.random() * (dist.length - 1))
    var isNumberwang = (Math.floor(Math.random() * 100) % 2 === 0)
    if (isNumberwang) {
        print("Thats numberwang!")
        console.log("Thats numberwang!")
    } else {
        print("Thats not numberwang!")
        console.log("Thats not numberwang!")
    }
    var factor = dist[index]
    return (index % 2 === 0) ? Math.floor(factor * (1 - Math.random()) * 10) / 10 : Math.floor(factor * (1 - Math.random()))

}
var randomInt = function(range) {
    return Math.floor(range * Math.random());
}
var randomFloat = function(range, presicion) {
    return Math.floor(range * Math.random() * Math.pow(10, presicion)) / Math.pow(10, presicion);
}
var runTests = function() {
    console.log("Running tests");
    var start = Date.now()
    var parsed = parse(
        "(list \
            (= 22 (let ((u 1) (a (+ 1 2))) (let ((y 3) (b 4)) (let ((z 5) (c 6)) (+ u y z a b c)))))\
            (= 22 (let ((x 1) (a (+ 1 2))) (let ((y 3) (b 4)) (let ((z 5) (c 6)) (if (= 22 (+ x y z a b c)) 22 23)))))\
            (= 21 21)\
            (< 1 2)\
            (null? null)\
            (not (null? 1))\
            (= 1 (car '(1 2 3)))\
            (= 2 (cadr '(1 2 3)))\
            (empty? '())\
            (= 9 (square 3))\
            (even? 2)\
            (odd? 3)\
            (= 1 (car (cons 1 2)))\
            (= 2 (cadr (cons 1 2)))\
            (number? 3)\
            (= 6 (foldl sum 0 '(1 2 3)))\
            (= 7 (foldr sum 1 '(1 2 3)))\
            (= 4 ((freeze 4)))\
            (let ((x 4)) (let ((y 3)) (> x y)))\
            (cond ((eq? 'else 'hello) #f) ((eq? 2 (+ 2 3)) #f) (else #t))\
            )");

    console.log("Parsed in " + (Date.now() - start) + "ms");

    var n = Date.now();
    var compiled = compile(parsed);
    console.log("Compiled in " + (Date.now() - n) + "ms");
    //console.log(compiled)
    n = Date.now();
    var tests = evaluate(compiled, global);
    console.log("Evaluated in " + (Date.now() - n) + "ms");

    assert((tests.indexOf("#f") === -1), "Test fail, #" + (tests.indexOf("#f") + 1));
    return "All tests passed in " + (Date.now() - start) + "ms";
}
var timeTests = function(num) {
    var start = Date.now()
    var tests = evaluate(compile(parse(
        "(list \
            (accumulate-iter sum 0 id 1 inc " + num + ")\
        )"
    )), global);

    var t = (Date.now() - start)
    return "Time tests passed in " + t + "ms";
}


//console.log("loaded Cream in " + (Date.now() - start) + "ms ");
//console.log(global);
//runTests();
//timeTests(10);