#!/usr/bin/env python3

import subprocess
import time
import sys
import os

def start_msfrpc():
    """Démarre le serveur Metasploit RPC"""
    
    print("🚀 Starting Metasploit RPC Server for Shennina...")
    
    # Configuration par défaut
    rpc_host = "127.0.0.1"
    rpc_port = "55553"
    rpc_user = "msf"
    rpc_pass = "shennina123"
    
    print(f"📡 RPC Server will listen on {rpc_host}:{rpc_port}")
    print(f"👤 Username: {rpc_user}")
    print(f"🔑 Password: {rpc_pass}")
    
    # Commande pour démarrer msfrpcd
    cmd = [
        "msfrpcd",
        "-P", rpc_pass,
        "-U", rpc_user,
        "-S",  # SSL désactivé pour simplifier
        "-p", rpc_port,
        "-a", rpc_host
    ]
    
    try:
        print("⚡ Launching msfrpcd...")
        print(f"Command: {' '.join(cmd)}")
        
        # Démarrer le processus
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Attendre un peu pour que le serveur démarre
        time.sleep(3)
        
        # Vérifier si le processus est toujours en cours
        if process.poll() is None:
            print("✅ Metasploit RPC Server started successfully!")
            print(f"🔗 Connect to: {rpc_host}:{rpc_port}")
            print("📝 Use these credentials in Shennina configuration")
            
            # Garder le processus en vie
            try:
                process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping Metasploit RPC Server...")
                process.terminate()
                process.wait()
                print("✅ Server stopped")
        else:
            stdout, stderr = process.communicate()
            print("❌ Failed to start Metasploit RPC Server")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return 1
            
    except FileNotFoundError:
        print("❌ Error: msfrpcd not found!")
        print("💡 Please install Metasploit Framework:")
        print("   sudo apt update && sudo apt install metasploit-framework")
        return 1
    except Exception as e:
        print(f"❌ Error starting RPC server: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(start_msfrpc())
