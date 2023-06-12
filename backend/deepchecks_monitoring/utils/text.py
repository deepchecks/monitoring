"""Text/string utilities."""
import re
import typing as t
import unicodedata

from deepchecks.utils.strings import format_number

__all__ = ["slugify", "format_float"]


def slugify(
    value: str,
    separator: str = "_"
):
    """Slugify given string.

    Convert to ASCII.
    Convert to lowercase.
    Remove characters that aren't alphanumerics, underscores.
    Convert spaces or repeated dashes to single 'seperator' character.
    Also strip leading and trailing whitespace, dashes, and underscores.
    """
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    value = re.sub(r"[-\s]+", separator, value)
    value = value.strip("_").strip(separator).strip("")
    return value


T = t.TypeVar("T")


def format_float(value: T, n_of_digits: int = 5) -> T:
    """Format float values."""
    if isinstance(value, float):
        return format_number(value, n_of_digits)
    elif isinstance(value, (list, tuple)):
        return type(value)(format_float(it, n_of_digits) for it in value)
    elif isinstance(value, dict):
        return type(value)((k, format_float(v, n_of_digits)) for k, v in value.items())
    else:
        return value
