
def sentry_send_hook(event, *args, **kwargs):  # pylint: disable=unused-argument
    """Sentry transaction send hook.

    Sentry "N+1 DB queries" detector incorrectly identifies a load of
    monitoring data during monitor execution as the 'N+1' problem, to
    prevent this we change a span 'op' key to the next value - 'monitoring-data-load'.
    Sentry uses this key to identify database queries and expects it to be equal
    to 'db' or 'db.query'.
    """
    if event.get('type') == 'transaction':
        for span in event.get('spans', tuple()):
            if (
                span.get('op') in ['db', 'db.query', 'db.sql.query']
                and '_monitor_data_' in span.get('description', '')
            ):
                span['op'] = 'monitoring-data-load'
    return event


def traces_sampler(sampling_context):
    """Return trace sampling rate for given context."""
    source = sampling_context['transaction_context']['source']
    # Filtering out say-hello messages completely
    if source == 'route' and sampling_context['asgi_scope'].get('path') == '/api/v1/say-hello':
        return 0
    # For everything else return default rate
    return 0.1
