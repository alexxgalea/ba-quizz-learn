# Referințele de schelet pentru modulul rabbitmq.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_rabbitmq.py.

# === s-rabbitmq-consumer ===
def declare(ch, queue):
    dlq = queue + ".dlq"
    args = {
        # "" = exchange-ul implicit
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": dlq,
    }
    ch.queue_declare(dlq, durable=True)
    ch.queue_declare(
        queue,
        durable=True,
        arguments=args,
    )


def consume(ch, handle, queue="jobs"):
    def on_msg(ch, method, props, body):
        tag = method.delivery_tag
        try:
            handle(body)
        except Exception:
            # fără requeue: merge în DLQ
            ch.basic_nack(
                tag, requeue=False)
        else:
            ch.basic_ack(tag)

    declare(ch, queue)
    ch.basic_qos(prefetch_count=10)
    # auto_ack=False e implicit
    ch.basic_consume(queue, on_msg)
    ch.start_consuming()
# === end ===
