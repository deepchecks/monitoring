import pathlib
import ssl
import typing as t
from contextlib import asynccontextmanager, contextmanager

import sqlalchemy as sa
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Message
from aiosmtpd.smtp import AuthResult, LoginPassword
from OpenSSL import crypto
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from deepchecks_monitoring.monitoring_utils import json_dumps

__all__ = ["TestDatabaseGenerator", "create_dummy_smtp_server"]


close_database_connections = sa.text(
    "SELECT pg_terminate_backend(pid) "
    "FROM pg_stat_activity "
    "WHERE datname = :dbname"
).bindparams(sa.bindparam("dbname", type_=sa.String))


switch_database_template_flag = sa.text(
    "UPDATE pg_catalog.pg_database "
    "SET datistemplate = :flag "
    "WHERE datname = :dbname"
).bindparams(
    sa.bindparam("flag", type_=sa.Boolean, value=False),
    sa.bindparam("dbname", type_=sa.String),
)

fetch_database = sa.text(
    "SELECT * "
    "FROM pg_catalog.pg_database "
    "WHERE datname = :dbname "
    "LIMIT 1"
).bindparams(sa.bindparam("dbname", type_=sa.String))


class TestDatabaseGenerator:
    """Test utility type that helps to create a database per test function."""

    def __init__(
        self,
        engine: Engine,
        template_metadata: t.Sequence[sa.MetaData],
        template_name: str = "deepchecks_template",
        keep_template: bool = False,
        keep_copy: bool = False
    ):
        self.engine = engine
        self.template_name = template_name
        self.keep_template = keep_template
        self.keep_copy = keep_copy
        self.template_metadata = template_metadata
        self.create_template_database()

    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        self.drop_template_database()

    def create_template_database(self):
        """Create template database if needed."""
        with self.engine.connect() as c:
            record = c.execute(
                fetch_database.bindparams(dbname=self.template_name)
            ).first()

            if record is not None:
                # NOTE:
                # if template database already exists then we assume that
                # it is already prepopulated, contains tables/records/etc
                self.keep_template = True
                if not record.datistemplate:
                    raise RuntimeError(
                        f"Database with name '{self.template_name}' already "
                        "exists but it is not a template"
                    )
            else:
                c.execute(sa.text(f"CREATE DATABASE {self.template_name} ENCODING 'utf-8'"))
                c.execute(switch_database_template_flag.bindparams(flag=True, dbname=self.template_name))
                template_engine = sa.create_engine(self.engine.url.set(database=self.template_name))

                # TODO:
                # prepopulate database with records
                # TODO:
                # we have tables which must be create per organisation schema and
                # tables that must be create within our internal schema.
                # We need some API/workflow for that
                try:
                    self.template_metadata.create_all(template_engine)
                    self.populate_template_database(template_engine)
                finally:
                    template_engine.dispose()

    def drop_template_database(self):
        """Drop template database."""
        if self.keep_template:
            return
        with self.engine.connect() as c:
            c.execute(close_database_connections.bindparams(dbname=self.template_name))
            c.execute(switch_database_template_flag.bindparams(flag=False, dbname=self.template_name))
            c.execute(sa.text(f"DROP DATABASE {self.template_name}"))

    def populate_template_database(self, engine: Engine):
        """Populate temlate database."""
        pass

    @asynccontextmanager
    async def copy_template(self, name: str, engine_echo: bool = False) -> t.AsyncIterator[AsyncEngine]:
        """Create copy of a template database for test function and return async engine for it."""
        # # TODO:
        # # check whether it is possible to obtain a name of a
        # # test function that executed this fixture
        # test_database_name = f"test_{random_string()}"

        with self.engine.connect() as c:
            c.execute(close_database_connections.bindparams(dbname=self.template_name))
            c.execute(sa.text(f"CREATE DATABASE {name} ENCODING 'utf-8' TEMPLATE {self.template_name}"))

        async_engine = create_async_engine(
            self.engine.url.set(
                drivername="postgresql+asyncpg",
                database=name
            ),
            echo=engine_echo,
            json_serializer=json_dumps,
        )

        try:
            yield async_engine
        finally:
            await async_engine.dispose()

            if not self.keep_copy:
                with self.engine.connect() as c:
                    c.execute(close_database_connections.bindparams(dbname=name))
                    c.execute(sa.text(f"DROP DATABASE {name}"))


class SmtpAuthenticator:
    """Authenticator for SMTP servers."""

    def __init__(self, credentials = None):
        self.credentials = credentials

    def __call__(self, server, session, envelope, mechanism, auth_data):
        if not isinstance(auth_data, LoginPassword):
            return AuthResult(success=False, handled=False)

        if self.credentials is None:
            return AuthResult(success=True)

        for it in self.credentials:
            if not isinstance(it, LoginPassword):
                raise TypeError("Expected instance of LoginPassword")

            l = it.login if isinstance(it.login, bytes) else it.login.encode()
            p = it.passowrd if isinstance(it.password, bytes) else it.password.encode()

            if l == auth_data.login and p == auth_data.password:
                return AuthResult(success=True)

        return AuthResult(success=False)


class Mailbox(Message):
    """Mailbox."""

    def __init__(self, message_class=None):
        self.mailbox = []
        super().__init__(message_class)

    def handle_message(self, message):
        self.mailbox.append(message)

    def reset(self):
        self.mailbox.clear()


@contextmanager
def create_dummy_smtp_server(
    hostname: str = "localhost",
    port: int = 8025,
    credentials: t.Optional[t.Sequence[LoginPassword]] = None
) -> t.Iterator[Controller]:
    keyfile, certfile = generate_dummy_certificate()
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(certfile, keyfile)
    server = Controller(
        Mailbox(),
        hostname=hostname,
        port=port,
        tls_context=ssl_context,
        authenticator=SmtpAuthenticator(credentials)
    )
    try:
        server.start()
        yield server
    finally:
        server.stop()


def generate_dummy_certificate() -> t.Tuple[str, str]:
    parent_dir = pathlib.Path(__file__).absolute().parent

    keyfile = parent_dir / "dummy-key.pem"
    certfile = parent_dir / "dummy-cert.pem"

    key_exists = keyfile.exists() and keyfile.is_file()
    cert_exits = certfile.exists() and certfile.is_file()

    if key_exists and cert_exits:
        return str(keyfile.absolute()), str(certfile.absolute())

    if key_exists:
        keyfile.unlink()

    if cert_exits:
        certfile.unlink()

    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 4096)

    cert = crypto.X509()
    cert.get_subject().emailAddress = "dummy@testing.com"
    cert.set_serial_number(0)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(10*365*24*60*60)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, "sha512")

    with certfile.open("wt") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert).decode("utf-8"))

    with keyfile.open("wt") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k).decode("utf-8"))

    return str(keyfile.absolute()), str(certfile.absolute())
