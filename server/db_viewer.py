import streamlit as st
import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

st.set_page_config(page_title="SurgeAI DB Viewer", layout="wide")
st.title("SurgeAI Database Viewer")

@st.cache_resource
def get_connection():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        st.error(f"Failed to connect to DB: {e}")
        return None

conn = get_connection()

if conn:
    # Get list of tables
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cur.fetchall()]
        cur.close()
        
        if not tables:
            st.warning("No tables found in the database.")
        else:
            selected_table = st.sidebar.selectbox("Select Table", tables)
            
            st.header(f"Table: {selected_table}")
            
            # Query the table
            query = f"SELECT * FROM {selected_table} LIMIT 1000;"
            df = pd.read_sql_query(query, conn)
            
            st.dataframe(df, use_container_width=True)
            st.caption(f"Showing first {len(df)} rows.")

    except Exception as e:
        st.error(f"Error fetching data: {e}")
else:
    st.error("Could not connect to database. check .env file.")
