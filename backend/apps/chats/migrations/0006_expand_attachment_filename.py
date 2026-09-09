from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chats", "0005_ai_tasks_network_permission_requests"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attachments",
            name="file_name",
            field=models.CharField(max_length=255),
        ),
    ]
