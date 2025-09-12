from bof.layers import knx
from bof import BOFNetworkError
from bof.layers.knx.knx_network import *
from bof.layers.knx.knx_packet import *
from bof.layers.knx.knx_messages import *

knxnet = knx.KNXnet()

while True:
    try:
        i = 1
        while i > 0:
            print("Try #" + str(i) + " - Sending GroupValueWrite of 1 at 0/0/2" )
            
            knxnet.connect("192.168.21.242", 3671)
            response, source = knxnet.sr(connect_request_tunneling(knxnet))
            try:
                response_data_block = response.scapy_pkt.connection_response_data_block
                knx_source_address = response_data_block.connection_data.knx_individual_address
                channel = response.scapy_pkt.communication_channel_id
            except AttributeError:
                raise BOFNetworkError("Cannot extract required data from response.") from None
            # Send group write request, wait for ack and response, ack back
            cemi = cemi_group_write("0/0/2", 1, knx_source_address)
            ack, source = knxnet.sr(tunneling_request(channel, 0, cemi))
            response, source = knxnet.receive()
            knxnet.send(tunneling_ack(channel, 0))
            # End tunneling connection
            response, source = knxnet.sr(disconnect_request(knxnet, channel))
            knxnet.disconnect()
  
            i += 1
            
    except BOFNetworkError as bne:
        print(str(bne))
        print("New attempt")
        continue
    finally:
        knxnet.disconnect()
