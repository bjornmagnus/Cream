(begin 
    (define (% a b) 
        (js (mod a b)))
    (define (< a b) 
        (js (less a b)))
    (define (> a b) 
        (js (more a b)))
    (define (<= a b) 
        (js (lessOrEqual a b)))
    (define (>= a b) 
        (js (moreOrEqual a b)))
    (define (car lst) 
        (js (car lst)))
    (define (eq? a b) 
        (js (isEqual a b)))
    (define (cdr lst) 
        (js (cdr lst)))
    (define (cadr lst)
        (js (cadr lst)))
    (define (cons x y) (js (cons x y)))
    (define (and a b) 
        (js (and a b)))
    (define & and)
    (define (or a b) 
        (js (or a b)))
    (define (null? x) 
        (= null x))
    (define (compose f g) 
        (lambda (x) (f (g x))))
    (define (square x) 
        (* x x)) 
    (define (not x) 
        (if x #f #t)) 
    (define (even? x) 
        (= 0 (% x 2))) 
    (define (odd? x) 
        (not (even? x))) 
    (define (inc x) 
        (+ 1 x)) 
    (define (double x) 
        (* 2 x)) 
    (define (id x) x) 
    (define identity id) 
    (define PI 3.14159265) 
    (define (sum x y) 
        (+ x y)) 
    (define add2 (sum 2)) 
    (define (accumulate combiner null-value term a next b)
        (if (> a b)
            null-value
            (combiner (term a) 
                (accumulate combiner null-value term (next a) next b))))
    (define (accumulate-iter combiner acc term a next b)
        (if (> a b) 
            acc
            (accumulate-iter combiner (combiner (term a) acc) term (next a) next b)))
    (define (foldl f init lst)
        (if (empty? (cdr lst)) 
            (f (car lst) init)
            (foldl f (f (car lst) init) (cdr lst))))
    (define (foldr f init lst)
        (if (empty? (cdr lst))
            (f (car lst) init)
            (f (car lst) (foldr f init (cdr lst)))))
    (define (append x y) (js (append x y)))
    (define (empty? lst) (js (isEmpty lst)))
    (define (log message) (js (log message)))
    (define (alert message) (js (alrt message)))
    (define (number? x) (if (js (isNumber x)) #t #f))
    (define (randomInt range) (js (randomInt range)))
    (define (numberwang) (js (numberwang null)))
    (define (randomFloat range presicion) (js (randomFloat range presicion)))
    (define (force x)
        (x))
    (define (build-lambda params body)
        (list 'lambda params body))
    (defmacro freeze 
        (lambda (x) (build-lambda '() x)))

    (define delay freeze)
    (defmacro let 
        (lambda (vars body)
            (append 
                (list (build-lambda (map car vars) body))
                (map cadr vars))))
    (define (map function lst) 
            (foldr (lambda (x y) (cons (function x) y)) '() lst))
    (defmacro require (lambda (name) (list 'js (list 'require name))))

    (defmacro cond 
        (lambda args 
            (begin
                (define (cnd args)
                    (if (not (empty? (cdr args)))
                        (list 
                            'if (car (car args)) 
                                (cadr (car args)) 
                                (cnd (cdr args)))
                        (if (eq? 'else (car (car args)))
                            (cadr (car args)) 
                            (list 
                                'if (car (car args)) 
                                    (cadr (car args)) 
                                    (quote 'void)))))
                (cnd args))))
    'ok
) 



