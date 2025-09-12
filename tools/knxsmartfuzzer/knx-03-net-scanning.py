from bof.layers.knx import search
from bof.layers.knx.knx_network import *
from bof.layers.knx.knx_packet import SID
from bof.layers.knx.knx_messages import *
from bof.layers.raw_scapy import knx as scapy_knx 
from bof.layers.knx.knx_functions import KNXDevice
from bof.base import BOFNetworkError
from time import sleep


while True:
    devices = []
    try:
        search_req = KNXPacket(type=SID.search_request)
        responses = KNXnet.multicast(search_req, (MULTICAST_ADDR, KNX_PORT))
        print('=== KNX Search Response ===')
        for response, source in responses:
            response = KNXPacket(response)
            response.show2()
            device = KNXDevice.init_from_search_response(response)
            devices.append(device)
        print('===========================')
    except BOFNetworkError:
        print('Network error on KNX Search. Trying again in 5 seconds...')
        sleep(5)
        continue 

    while True:
        try:
            print('=== KNX Description Request responses ===')
            for device in devices:
                print("Trying: " + device.ip_address + ":" + str(device.port))
                knxnet = KNXnet().connect(device.ip_address, device.port)
                # Initiate session
                response, source = knxnet.sr(connect_request_management(knxnet))
                channel = response.communication_channel_id
                # Information gathering
                response, source = knxnet.sr(description_request(knxnet))
                device_info = KNXDevice.init_from_description_response(response, source)
                # End session
                response, source = knxnet.sr(disconnect_request(knxnet, channel))
                knxnet.disconnect()
                print(device_info)
            print('========================================')
            break
        except BOFNetworkError:
            print('Network error on KNX Description Request. Trying again in 5 seconds...')
            sleep(5)
            continue 
    
    print("Next scan in 10 seconds")

