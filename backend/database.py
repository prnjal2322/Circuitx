"""
CircuitX SQLite Database Module
Manages persistent storage for conversations, messages, and application settings.
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from config import CIRCUITX_DB_PATH

DB_PATH = CIRCUITX_DB_PATH


def get_db_connection():
    """Create a new SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables if they do not exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Conversations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                domain TEXT NOT NULL DEFAULT 'general',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                attachments TEXT DEFAULT '[]',
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
            )
        """)
        
        # Settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        
        conn.commit()


def get_all_conversations() -> List[Dict[str, Any]]:
    """Retrieve all conversations ordered by updated_at descending."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, domain, created_at, updated_at 
            FROM conversations 
            ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_conversation_by_id(conv_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single conversation metadata."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, domain, created_at, updated_at FROM conversations WHERE id = ?", (conv_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_conversation(conv_id: str, title: str, domain: str = "general") -> Dict[str, Any]:
    """Create a new conversation record."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO conversations (id, title, domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (conv_id, title, domain, now, now)
        )
        conn.commit()
    return {"id": conv_id, "title": title, "domain": domain, "created_at": now, "updated_at": now}


def update_conversation(conv_id: str, title: Optional[str] = None, domain: Optional[str] = None) -> bool:
    """Update conversation title or domain and refresh updated_at."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if title and domain:
            cursor.execute(
                "UPDATE conversations SET title = ?, domain = ?, updated_at = ? WHERE id = ?",
                (title, domain, now, conv_id)
            )
        elif title:
            cursor.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (title, now, conv_id)
            )
        elif domain:
            cursor.execute(
                "UPDATE conversations SET domain = ?, updated_at = ? WHERE id = ?",
                (domain, now, conv_id)
            )
        else:
            cursor.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conv_id)
            )
        conn.commit()
        return cursor.rowcount > 0


def delete_conversation(conv_id: str) -> bool:
    """Delete a conversation and its associated messages."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_conversation_messages(conv_id: str) -> List[Dict[str, Any]]:
    """Retrieve all messages for a specific conversation in chronological order."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, conversation_id, role, content, attachments, metadata, created_at 
            FROM messages 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC
        """, (conv_id,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            item = dict(r)
            try:
                item["attachments"] = json.loads(item["attachments"])
            except Exception:
                item["attachments"] = []
            try:
                item["metadata"] = json.loads(item["metadata"])
            except Exception:
                item["metadata"] = {}
            result.append(item)
        return result


def add_message(
    msg_id: str,
    conv_id: str,
    role: str,
    content: str,
    attachments: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Append a new message to a conversation."""
    now = datetime.now(timezone.utc).isoformat()
    attachments_json = json.dumps(attachments or [])
    metadata_json = json.dumps(metadata or {})
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Verify conversation exists or create on the fly
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO conversations (id, title, domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (conv_id, "New Session", "general", now, now)
            )
        
        cursor.execute(
            """INSERT INTO messages (id, conversation_id, role, content, attachments, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (msg_id, conv_id, role, content, attachments_json, metadata_json, now)
        )
        
        cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))
        conn.commit()
        
    return {
        "id": msg_id,
        "conversation_id": conv_id,
        "role": role,
        "content": content,
        "attachments": attachments or [],
        "metadata": metadata or {},
        "created_at": now
    }


def clear_messages(conv_id: str) -> bool:
    """Clear all messages in a conversation."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        conn.commit()
        return True
