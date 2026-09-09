from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chats", "0006_expand_attachment_filename"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attachments",
            name="file",
            field=models.FileField(max_length=500, upload_to="chat_attachments/"),
        ),
    ]
