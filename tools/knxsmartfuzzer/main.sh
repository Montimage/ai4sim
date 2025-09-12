#!/bin/bash

attack_id=""
knxserver=""
knxport=""

# Parse options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --attack-id) attack_id="$2"; shift ;;
        --knxserver) knxserver="$2"; shift ;;
        --knxport) knxport="$2"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

if [[ -z "$attack_id" || -z "$knxserver" || -z "$knxport" ]]; then
    echo "Usage: $0 --attack-id <id> --knxserver <ip> --knxport <port>"
    exit 1
fi

if ! [[ $attack_id =~ ^[1-6]$ ]]; then
    echo "Error: Attack ID must be between 1 and 6."
    exit 2
fi

# Run the corresponding Python script based on the attack number
case $attack_id in
    1) python3 knx-01-fuzzing-bof.py $knxserver ;;
    2) python3 knx-02-unauthorized.py $knxserver $knxport;;
    3) python3 knx-03-net-scanning.py ;;
    4) python3 knx-04-bus-scanning.py $knxserver;;
    5) python3 knx-05-flooding-valid.py $knxserver $knxport;;
    6) python3 knx-06-flooding-invalid.py $knxserver $knxport;;
    *) echo "Invalid attack ID" ; exit 3 ;;
esac
