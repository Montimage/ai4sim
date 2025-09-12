from bof.layers import knx
from bof import BOFNetworkError
from bof.layers.knx.knx_network import *
from bof.layers.knx.knx_packet import *
from bof.layers.knx.knx_messages import *
from random import randint


knxnet = knx.KNXnet()

while True:
    try:
        i = 1
        while i > 0:

            source_address = randint(1, 255)
            destination_address = randint(1, 255)
            value_to_send = randint(1, 255)
            
            source_address = "1.1." + str(source_address)
            destination_address = "0/0/" + str(destination_address)

            print("Try #" + str(i) + " - Sending the value " + str(value_to_send) + " from " + source_address + " at " + destination_address)

            knxnet.connect("192.168.21.242", 3671)

            conn_req = KNXPacket(type=SID.connect_request,
                                connection_type=CONNECTION_TYPE_CODES.tunnel_connection)
            if knxnet and isinstance(knxnet, KNXnet) and knxnet.is_connected:
                conn_req.scapy_pkt.control_endpoint.ip_address = knxnet.source_address
                conn_req.scapy_pkt.control_endpoint.port = knxnet.source_port
                conn_req.scapy_pkt.data_endpoint.ip_address = knxnet.source_address
                conn_req.scapy_pkt.data_endpoint.port = knxnet.source_port

            response, source = knxnet.sr(conn_req)
            try:
                response_data_block = response.scapy_pkt.connection_response_data_block
                knx_source_address = source_address
                channel = response.scapy_pkt.communication_channel_id
            except AttributeError:
                raise BOFNetworkError("Cannot extract required data from response.") from None
            # Send group write request, wait for ack and response, ack back
            cemi = cemi_group_write(destination_address, value_to_send, knx_source_address)
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
