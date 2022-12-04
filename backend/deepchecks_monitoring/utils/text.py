"""Text/string utilities."""
import re
import unicodedata

__all__ = ["slugify"]


def slugify(
    value: str,
    separator: str = "_"
):
    """Slugify given string.

    Convert to ASCII.
    Convert to lowercase.
    Remove characters that aren't alphanumerics, underscores, or hyphens.
    Convert spaces or repeated dashes to single 'seperator' character.
    Also strip leading and trailing whitespace, dashes, and underscores.
    """
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    value = re.sub(r"[-\s]+", separator, value)
    value = value.strip("_").strip(separator).strip("")
    return value
