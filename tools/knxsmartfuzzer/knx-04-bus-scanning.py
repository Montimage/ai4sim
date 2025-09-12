from bof.layers.knx import knx_functions
from bof import BOFNetworkError, BOFProgrammingError, BOFDevice, IS_IP
from bof.layers.knx.knx_network import *
from bof.layers.knx.knx_packet import *
from bof.layers.knx.knx_messages import *
from bof.layers.raw_scapy import knx as scapy_knx

KNX_TUNNEL_IP = '192.168.21.242'

def individual_address_scan(addresses):
    exists = []
    knxnet = KNXnet().connect(KNX_TUNNEL_IP)
    # Start tunneling connection
    response, source = knxnet.sr(connect_request_tunneling(knxnet))
    channel = response.communication_channel_id
    # Send cemi connect request, wait for ack and response, ack back
    seq = 0
    for address in addresses:
        print(address)
        c_connect = cemi_connect(address)
        ack, source = knxnet.sr(tunneling_request(channel, seq, c_connect)); seq+=1
        response, source = knxnet.receive()
        knxnet.send(tunneling_ack(channel, response.sequence_counter))
        # Sends cemi device description read, wait for ack and response
        c_read = cemi_dev_descr_read(address)
        tun_req = tunneling_request(channel, seq, c_read); seq+=1
        ack, source = knxnet.sr(tun_req); 
        response, source = knxnet.receive() # dev descr read con
        knxnet.send(tunneling_ack(channel, ack.sequence_counter))
        try:
            # If device exists, we should get a cemi ACK, to which we ack
            # Else, timeout (BOFNetworkError) is raised
            response, source = knxnet.receive()
            knxnet.send(tunneling_ack(channel, response.sequence_counter))
            # And then we get the answer we want which is a devdescrresp, and we ack
            response, source = knxnet.receive()
            response.show2()
            knxnet.send(tunneling_ack(channel, response.sequence_counter))
            # And then we send a cemi ACK because why not and then we get an ack
            # and then a cemi ack to which we ack ffs
            c_ack = cemi_ack(address)
            ack, source = knxnet.sr(tunneling_request(channel, seq, c_ack)); seq+=1
            response, source = knxnet.receive()
            knxnet.send(tunneling_ack(channel, response.sequence_counter))
            exists.append(address)
        except BOFNetworkError:
            # Boiboite did not reply with descr resp == device does not exist
            pass
        finally:
            # Send cemi disconnect request, wait for ack and response, ack back
            c_disco = cemi_disconnect(address)
            ack, source = knxnet.sr(tunneling_request(channel, seq, c_disco)); seq+=1
            response, source = knxnet.receive()
            knxnet.send(tunneling_ack(channel, response.sequence_counter))
    # End tunneling connection
    response, source = knxnet.sr(disconnect_request(knxnet, channel))
    knxnet.disconnect()
    return exists

begin, end = 4352, 4352+255
addresses = [knx_functions.INDIV_ADDR(x) for x in range(begin, end)]

print(individual_address_scan(addresses))
