# Keep the contract tests discoverable by Django's default app test loader.
# Re-exporting the class leaves its module pointing at the secondary module.
from apps.chats.tests_ai_client import AIClientTests as _AIClientTests


class AIClientTests(_AIClientTests):
    __module__ = __name__
