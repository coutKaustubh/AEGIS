# Keep the contract tests discoverable by Django's default app test loader.
# Re-exporting the class leaves its module pointing at the secondary module.
from apps.chats.tests_ai_client import AIClientTests as _AIClientTests
from apps.chats.tests_concurrency_and_expiration import ConcurrencyAndExpirationTests as _ConcurrencyAndExpirationTests


class AIClientTests(_AIClientTests):
    __module__ = __name__


class ConcurrencyAndExpirationTests(_ConcurrencyAndExpirationTests):
    __module__ = __name__

