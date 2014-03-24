(begin
	(define the-empty-stream null)
	(defmacro cons-stream 
        (lambda (a b) 
            (list 'cons a (list 'freeze b) )))
	(define (stream-car stream) (car stream))
	(define (stream-cdr stream) (force (cadr stream)))
	(define (add-streams s1 s2)
		(cond 
			((null? s1) s2)
			((null? s2) s1)
			(else (cons-stream (+ (stream-car s1) (stream-car s2))
				(add-streams (stream-cdr s1) 
					(stream-cdr s2))))))
	(define ones (cons-stream 1 ones))
	(define integers (cons-stream 1 (add-streams ones integers))) 
	(define (stream-ref stream n)
		(if (= n 0)
			(stream-car stream)
			(stream-ref (stream-cdr stream) (- n 1))))

	(define (stream-filter pred stream)
		(cond 
			((null? stream) 
				the-empty-stream)
			((pred (stream-car stream))
				(cons-stream (stream-car stream)
					(stream-filter pred (stream-cdr stream))))
			(else 
				(stream-filter pred (stream-cdr stream)))))
	'ok
)