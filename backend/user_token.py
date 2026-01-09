import datetime
import os
import sqlite3
from typing import List, Optional, TypedDict

# -- TODO: USE contextlib to manage connections? --
# from contextlib import contextmanager

#  @contextmanager
#     def get_connection(self):
#         conn = sqlite3.connect(self.db_path)
#         conn.row_factory = sqlite3.Row
#         try:
#             yield conn
#         finally:
#             conn.close()
#     # usage:
#     with self.get_connection() as conn:

#########################################

# --- SQLite Database Functions ---
DB_NAME = os.environ.get("DB_NAME", "user_data.db")


class TokenUsage(TypedDict):
    input_tokens: int
    output_tokens: int
    total_tokens: int


default_token_usage: TokenUsage = {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0,
}


def adapt_date_iso(val):
    """Adapt datetime.date to ISO 8601 date."""
    return val.isoformat()


def adapt_datetime_iso(val):
    """Adapt datetime.datetime to timezone-naive ISO 8601 date."""
    return val.replace(tzinfo=None).isoformat()


def adapt_datetime_epoch(val):
    """Adapt datetime.datetime to Unix timestamp."""
    return int(val.timestamp())


sqlite3.register_adapter(datetime.date, adapt_date_iso)
sqlite3.register_adapter(datetime.datetime, adapt_datetime_iso)
sqlite3.register_adapter(datetime.datetime, adapt_datetime_epoch)


def convert_date(val):
    """Convert ISO 8601 date to datetime.date object."""
    return datetime.date.fromisoformat(val.decode())


def convert_datetime(val):
    """Convert ISO 8601 datetime to datetime.datetime object."""
    return datetime.datetime.fromisoformat(val.decode())


def convert_timestamp(val):
    """Convert Unix epoch timestamp to datetime.datetime object."""
    return datetime.datetime.fromtimestamp(int(val))


sqlite3.register_converter("date", convert_date)
sqlite3.register_converter("datetime", convert_datetime)
sqlite3.register_converter("timestamp", convert_timestamp)


class db_object:
    # Class variable -> not instance variable
    # Class variable to track DB setup status (not instance variable)
    db_path = os.path.join(os.getcwd(), DB_NAME)
    DB_SETUP_COMPLETE = os.path.exists(db_path)
    print(f"DB_SETUP_COMPLETE initial: {DB_SETUP_COMPLETE}")

    @staticmethod
    def setup__db(db_name: str = DB_NAME):
        if not db_object.DB_SETUP_COMPLETE:
            """Initializes the SQLite database and creates the token_usage table."""
            """ Call sqlite3.connect() to create a connection to the db in the current working directory,
            implicitly creating it if it does not exist:
            """
            conn: sqlite3.Connection = sqlite3.connect(db_name)
            cursor = conn.cursor()
            try:
                ######################################
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY,
                        identifier TEXT NOT NULL UNIQUE,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        balance REAL DEFAULT 0.0,
                        metadata JSONB NOT NULL
                    );
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS users_identifier_index
                               ON users(identifier);
                    """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS threads (
                        id UUID PRIMARY KEY,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deletedAt TIMESTAMP,
                        name TEXT,
                        userId UUID,
                        userIdentifier TEXT,
                        tags TEXT[],
                        metadata JSONB,
                        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                    );
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS threads_userId_index
                               ON threads(userId);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS threads_name
                               ON threads(name);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS threads_createdAt
                               ON threads(createdAt);
                    """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS steps (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    threadId UUID NOT NULL,
                    parentId UUID,
                    disableFeedback BOOLEAN NOT NULL DEFAULT TRUE,
                    streaming BOOLEAN NOT NULL DEFAULT TRUE,
                    waitForAnswer BOOLEAN,
                    isError  BOOLEAN,
                    defaultOpen BOOLEAN,
                    metadata JSONB,
                    tags TEXT[],
                    input TEXT,
                    output TEXT,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    start TIMESTAMP,
                    end TIMESTAMP,
                    generation JSONB,
                    showInput TEXT,
                    language TEXT,
                    indent INT,
                    FOREIGN KEY (threadId) REFERENCES threads(id) ON DELETE CASCADE
                );
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_createdAt
                               ON steps(createdAt);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_end
                               ON steps(end);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_start
                               ON steps(start);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_threadId
                               ON steps(threadId);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_type
                               ON steps(type);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_name
                               ON steps(name);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS step_name
                               ON steps(threadId, start, end);
                    """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS elements(
                        id UUID PRIMARY KEY,
                        threadId UUID,
                        stepId UUID,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        type TEXT,
                        url TEXT,
                        chainlitKey TEXT,
                        name TEXT NOT NULL,
                        display TEXT,
                        objectKey TEXT,
                        size TEXT,
                        page INT,
                        language TEXT,
                        forId UUID,
                        mime TEXT,
                        props JSONB,
                    FOREIGN KEY (threadId) REFERENCES threads(id) ON DELETE CASCADE,
                    FOREIGN KEY (stepId) REFERENCES steps(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS elements_threadId
                               ON elements(threadId);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS elements_stepId
                               ON elements(stepId);
                    """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS feedbacks (
                        id UUID PRIMARY KEY,
                        forId UUID NOT NULL,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        threadId UUID NOT NULL,
                        value INT NOT NULL DEFAULT 0,
                        name TEXT NOT NULL DEFAULT 'default',
                        comment TEXT,
                        FOREIGN KEY (threadId) REFERENCES threads(id) ON DELETE CASCADE
                        );
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS feedbacks_threadId
                               ON feedbacks(threadId);
                    """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS feedbacks_name
                               ON feedbacks(name);
                    """)

                #####################################

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS payments(
                        id UUID PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        transaction_id UUID UNIQUE NOT NULL,
                        order_code TEXT NOT NULL,
                        event_id INT NOT NULL,
                        eci INT NOT NULL,
                        amount INT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(identifier) ON DELETE NO ACTION
                    )
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS payments_userId_index    
                                 ON payments(user_id);
                      """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS transaction_id_index    
                                 ON payments(transaction_id);    
                      """)
                ####################################

                # Set default balance to 1.0 USD so that
                # new users can start using the service immediately
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_balance (
                        user_id TEXT PRIMARY KEY,
                        balance REAL DEFAULT 1.0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                # since chat_id is defined as INTEGER PRIMARY KEY it will be the alias of the ROWID
                # its autoincremented value will be returned by cursor.lastrowid
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS token_usage (
                        chat_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        input_tokens INTEGER DEFAULT 0,
                        output_tokens INTEGER DEFAULT 0,
                        total_tokens INTEGER DEFAULT 0,
                        FOREIGN KEY (user_id) REFERENCES user_balance(user_id)
                               ON DELETE NO ACTION
                               ON UPDATE NO ACTION
                    )
                """)
                # enforce foreign key constraints ON DELETE NO ACTION
                # because as of SQLite version 3.6.19, the default setting for foreign key enforcement is OFF.
                # https://www.sqlite.org/foreignkeys.html#fk_actions
                cursor.execute("PRAGMA foreign_keys = ON;")
                # Enable WAL mode for better concurrency
                cursor.execute("PRAGMA journal_mode=WAL;")

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS turn_token_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chat_id INTEGER NOT NULL,
                        last_cumulative_turn_tokens INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (chat_id) REFERENCES token_usage(chat_id)
                               ON DELETE NO ACTION
                               ON UPDATE NO ACTION
                    )
                """)
                # NOTE: A query sees all changes that are completed
                # on the same database connection
                # prior to the start of the query,
                # **regardless of whether or not those changes have been committed.**
                # therefore we can create indexes after creating tables even if we don't commit yet
                # because the connection can see the tables
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS user_foreign_key
                               ON token_usage(user_id)
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS chat_foreign_key
                               ON turn_token_log(chat_id)
                    """)

                cursor.execute("""
                   CREATE TABLE IF NOT EXISTS contacts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT,
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        subject TEXT,
                        message TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_read BOOLEAN DEFAULT 0,
                        FOREIGN KEY (user_id) REFERENCES users(identifier) ON DELETE NO ACTION
                    )
                """)
                conn.commit()
                conn.close()
                db_object.DB_SETUP_COMPLETE = True
            except sqlite3.Error as e:
                print(f"Database error during setup: {e}")

    @staticmethod
    def checkpoint_init(db_name: str = DB_NAME) -> bool:
        """Initiates a WAL checkpoint to merge the WAL file to the main database file.
        Returns:
            True if the checkpoint was successful,
            False otherwise."""
        try:
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            cursor.execute("PRAGMA wal_checkpoint(RESTART);")
            conn.close()
            return True
        except sqlite3.Error as e:
            print(f"Database error during WAL checkpoint: {e}")
            return False

    def __init__(self, user_id: str, db_name: str = DB_NAME):
        # call static method to setup the db
        db_object.setup__db()
        # Connection is initially None
        self.conn: Optional[sqlite3.Connection] = None
        self.db_name: str = db_name
        self.user_id: str = user_id
        self.chat_id: Optional[int] = None

    # Setup the database if not already done
    def setup_user_db_connection(self) -> Optional[sqlite3.Connection]:
        """Opens a new database connection for the session."""
        if db_object.DB_SETUP_COMPLETE:
            try:
                self.conn = sqlite3.connect(self.db_name)
                print(f"Database connection established: {id(self.conn)}")
            except sqlite3.Error as e:
                print(f"Database error connecting to DB: {e}")
            # finally:
            #     return self.conn
        return self.conn

    def check_db_connection(self) -> bool:
        """Checks if the database connection is active."""
        if db_object.DB_SETUP_COMPLETE:
            if self.conn is not None:
                print(f"connection id: {id(self.conn)}")
                return True
        print("Database connection is not active.")
        return False

    def check_user_exists(self) -> Optional[bool]:
        """Checks if a user exists in the database.
        Returns:
            True if the user exists,
            False if the user does not exist,
            None if a database error occurred."""
        # check if connection is not None
        if self.check_db_connection():
            # ... use cursor ...
            try:
                cursor = self.conn.cursor()  # type: ignore
                # It returns one row with the value 1 for each matching entry.
                # this is more efficient than returning the whole row
                cursor.execute(
                    "SELECT 1 FROM user_balance WHERE user_id = ?", (self.user_id,)
                )
                return cursor.fetchone() is not None
            except sqlite3.Error as e:
                print(f"Database error checking user {self.user_id}: {e}")
        return None

    def create_user_balance(self) -> Optional[bool]:
        """
        Creates a new user in the database.
        Returns:
            True if the user was created successfully,
            None if a database error occurred.
        """
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                """
                INSERT INTO user_balance (user_id) 
                VALUES (?)
            """,
                (self.user_id,),
            )
            self.conn.commit()  # type: ignore
        except sqlite3.Error as e:
            print(f"Database error creating user {self.user_id}: {e}")
            return None
        return True

    def update_user_balance(self, turn_tokens: int) -> Optional[bool]:
        """
        Updates the user's balance in the database.
        Returns:
            True if the update was successful,
            False if no rows were updated,
            None if a database error occurred.
        """
        if not self.check_db_connection():
            return None
        # Deduct 0.0001$ per token from the user's balance
        charge_per_token: float = float(os.environ.get("CHARGE_PER_TOKEN", 0.0001))
        balance_to_deduct = charge_per_token * turn_tokens
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                """
                UPDATE user_balance 
                        SET 
                           balance = balance - ?, 
                           updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ?
            """,
                (
                    balance_to_deduct,
                    self.user_id,
                ),
            )
            self.conn.commit()  # type: ignore
        except sqlite3.Error as e:
            print(f"Database error updating user {self.user_id}: {e}")
            return None
        return cursor.rowcount == 1

    def get_user_balance(self) -> Optional[tuple]:
        """Retrieves a user's balance.
        Returns:
            A tuple (balance,) if successful,
            None if a database error occurred."""
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                "SELECT balance FROM user_balance WHERE user_id = ?", (self.user_id,)
            )
            row = cursor.fetchone()
        except sqlite3.Error as e:
            print(f"Database error retrieving balance for user {self.user_id}: {e}")
            return None
        return row  # if row is None then there is a dabatse error because the user does not exist

    def create_new_token_usage(
        self, cb_data: TokenUsage = default_token_usage.copy()
    ) -> Optional[bool]:
        """Creates a new chat id for a user and initializes with 0 tokens.
        Returns:
            True if the chat_id was created and assigned successfully,
            None if a database error occurred."""
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            # timestamp = datetime.datetime.now() # Current timestamp
            # Insert the usage
            cursor.execute(
                """
                INSERT INTO token_usage (user_id, input_tokens, output_tokens, total_tokens) 
                VALUES (?, ?, ?, ?)               
            """,
                (
                    # timestamp, #  WE DONT NEED TO PASS IN THE TIMESTAMP, IT IS DEFAULTED TO CURRENT_TIMESTAMP
                    self.user_id,
                    cb_data["input_tokens"],
                    cb_data["output_tokens"],
                    cb_data["total_tokens"],
                ),
            )
            self.conn.commit()  # type: ignore
        except sqlite3.Error as e:
            print(f"Database error during chat creation for user {self.user_id}: {e}")
            return None
        # these statements must be outside the try-except block
        # because they don't raise sqlite3.Error exceptions they only raise AttributeError if cursor is None
        # but that will not happen because if cursor creation fails we return None above
        # so if we reach here cursor is guaranteed to be valid
        self.chat_id = cursor.lastrowid  # simple Attribute lookup, no DB operation
        return True  # Return

    def update_token_usage(self, cb_data: TokenUsage) -> Optional[bool]:
        """Updates token usage for a specific turn in the database.
        Returns:
            True if the update was successful,
            False if no rows were updated,
            None if a database error occurred."""
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                """
                UPDATE token_usage SET 
                    input_tokens = ?,
                    output_tokens = ?,
                    total_tokens = ?
                WHERE chat_id = ? AND user_id = ?
            """,
                (
                    cb_data["input_tokens"],
                    cb_data["output_tokens"],
                    cb_data["total_tokens"],
                    self.chat_id,
                    self.user_id,
                ),
            )
            self.conn.commit()  # type: ignore
        except sqlite3.Error as e:
            print(f"Database error during usage update for user {self.user_id}: {e}")
            return None
        # Success/Return logic is outside the try block:
        # This code only runs if the execute AND commit both succeeded.
        return cursor.rowcount == 1

    def get_all_chats_tokens(self) -> Optional[List[int]]:
        """Retrieves a user's total token usage over ALL TURNS.
        Returns:
            A list of three integers [input_tokens, output_tokens, total_tokens] if successful,
            None if a database error occurred."""
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                "SELECT input_tokens, output_tokens, total_tokens FROM token_usage WHERE user_id = ?",
                (self.user_id,),
            )
            # there should be at least the default row for the current chat id with all 0 tokens
            rows = cursor.fetchall()  # or [(0, 0, 0)]
        except sqlite3.Error as e:
            print(f"Database error retrieving usage for user {self.user_id}: {e}")
            return None
        # convert from long to wide and sum axis = 0 REF:https://book.pythontips.com/en/latest/zip.html"""
        try:
            # TODO: ADD TEST@@@
            return [sum(row) for row in zip(*rows)]
        except (ValueError, TypeError) as te:
            print(f"Value error retrieving usage for user {self.user_id}: {te}")
            return None

    def get_last_turn_token_log(self) -> Optional[tuple]:
        """return the total tokens of the last turn of the current chat id
        Returns:
            A tuple (last_cumulative_turn_tokens,) if successful,
            None if a database error occurred."""
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                """
                SELECT last_cumulative_turn_tokens 
                           FROM turn_token_log 
                WHERE chat_id = ? 
                           ORDER BY created_at DESC
                           LIMIT 1
            """,
                (self.chat_id,),
            )
            row = (
                cursor.fetchone()
            )  # this could be None if there is no entry in the log yet
        except sqlite3.Error as e:
            print(f"Database error updating balance for user {self.user_id}: {e}")
            return None
        return row or (0,)  # Default to 0 if no log entry yet

    def log_turn_tokens(self, new_cumulative_tokens: int) -> Optional[bool]:
        """Adds a new entry to the turn_token_log table
        Returns:
            True if the log entry was created successfully,
            None if a database error occurred."""
        if not self.check_db_connection():
            return None
        try:
            cursor = self.conn.cursor()  # type: ignore
            cursor.execute(
                """
                INSERT INTO turn_token_log (chat_id, last_cumulative_turn_tokens) 
                VALUES (?, ?)                
            """,
                (
                    self.chat_id,
                    new_cumulative_tokens,
                ),
            )
            self.conn.commit()  # type: ignore
        except sqlite3.Error as e:
            print(f"Database error inserting turn log for {self.chat_id}: {e}")
            return None
        return True

    def close_connection(self) -> bool:
        """Closes the database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            return True
        return False
