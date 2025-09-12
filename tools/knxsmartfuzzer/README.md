# KNXSmartFuzzer - v1

## Introduction
The `KNXSmartFuzzer` is a component of AI4SIM that implements various cyber-attacks against a KNX infrastructure. 

The first version of the `KNXSmartFuzzer` consists of a script that can execute 6 different KNX attacks. The KNX attacks implemented are the following: 1) Fuzzing, 2) Unauthorized access, 3) Net scanning, 4) bus scanning, 5) flooding attack with valid packets, 6) flooding attack with invalid packets. These attacks are executed through the `main.sh` script. More details about these attacks can be found in the appendix of this README.

To run the `KNXSmartFuzzer`, an entrypoint script is used (`main.sh`), in which the user must specify the KNX attack and the necessary parameters via command line arguments. The `KNXSmartFuzzer` has been designed to run as a docker container. Hence, each instance of an attack should run as a separate docker container.

## Requirements

The `KNXSmartFuzzer` requires docker to be installed in the host system. To install it, you can issue the following command:

```sh
sudo apt install docker.io
```

## Execution

To execute the `KNXSmartFuzzer`, you need first to login to the GitLab container registry and pull the docker image:
1. `docker login gitlab.ithaca.ece.uowm.gr:5050`
2. `docker pull gitlab.ithaca.ece.uowm.gr:5050/ai4cyber/knxsmartfuzzer-v1:latest`

After the image is pulled, the `docker run` command should be use to start the container(s). This is the general usage of the `docker run` command:

```shell
docker run -it --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged gitlab.ithaca.ece.uowm.gr:5050/ai4cyber/knxsmartfuzzer-v1:latest ./main.sh --attack-id <id> --knxserver <ip> --knxport <port>
```

A detailed explanation of each parameter follows bellow:

1. **``-it``**:
   - Combines two flags: `-i` and `-t`.
   - `-i` (interactive): Keeps the standard input (stdin) open even if not attached.
   - `-t` (tty): Allocates a pseudo-TTY, which allows for interactive terminal sessions.

2. **``--net=host``**:
   - Configures the container to use the host's network stack directly.
   - This means the container shares the network namespace with the host and can access network interfaces and services just like the host.

3. **``--cap-add=NET_ADMIN``**:
   - Adds the `NET_ADMIN` capability to the container.
   - Allows the container to perform various network-related operations such as configuring interfaces, modifying routing tables, and changing firewall rules.

4. **``--cap-add=NET_RAW``**:
   - Adds the `NET_RAW` capability to the container.
   - Enables the container to use raw sockets, which allows it to send and receive packets at the network level, bypassing standard TCP/UDP protocols.

5. **``--privileged``**:
   - Grants the container extended privileges.
   - Allows the container to access all devices on the host and perform various administrative operations that are normally restricted. This includes capabilities beyond `NET_ADMIN` and `NET_RAW`, essentially giving the container root-level access to the host system.

6. **``--attack-id <id>``**
   - Specifies the attack that the KNXFuzzer will execute.

7. **``--knxserver <ip>``**
   - Specifies the IP address of the targeted KNX/IP interface.

8. **``--knxport <port>``**
   - Specifies the UDP port of the KNX/IP interface


## Examples

With the following command, you can start the `KNXSmartFuzzer` and run attack #1 (BOF fuzzing), targeting the KNX/IP interface at `192.168.21.10:3671`.

```sh
docker run -it --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged gitlab.ithaca.ece.uowm.gr:5050/ai4cyber/knxsmartfuzzer-v1:latest ./main.sh --attack-id 1 --knxserver 192.168.21.242 --knxport 3671
```


## Appendix - KNX Attacks

### A.KNX.01 - BOF Fuzzing
The script `knx-01-fuzzing-bof.py` implements a simple fuzzing attack, by following this sequence: (source: https://github.com/Orange-Cyberdefense/bof)
1. The attacker initialises the `PropRead.req` message to be mutated during the fuzzing process.
2. The attacker sends a Tunnel Connection Request for Device Management (i.e., connection type `0x03`) to the KNX/IP interface.
3. The KNX/IP interface accepts the connection request.
4. The attacker sends a malformed `PropRead.req`, by setting random bytes to the values of all cEMI fields of `PropRead.req`, excluding `message_code` and the cEMI payload.
5. The KNX/IP interface sends an acknowledgement to confirm that it received the PropRead.req.
6. The KNX/IP interface does not reply with a `PropRead.con`, since it cannot process the malformed message.
7. The attacker sends another malformed `PropRead.req`.


### A.KNX.02 - Unauthorized Access
By exploiting lack of authentication/authorization, the attacker sends a `GroupValueWrite` message to the group address `0/0/54`. This command closes the Air Conditioning unit of the computer room.


### A.KNX.03 - Network scanning and identification
The attacker sends multicast messages to the TCP/IP network in order to discover KNX/IP routers or interfaces, which could further be used to access KNX buses. The attacker follows the steps bellow:
1. The attacker sends an empty UDP packet at `224.0.23.12`, which is the multicast address where all KNX/IP routers/interfaces are listening to.
2. Each device that listens to this address, responds with a KNX `Search Response`.
3. For each device that responded: 
    1. The attacker sends a Device Management Connection Request.
    2. The attacker sends a KNX `Description Request` message.
    3. Upon receiving the description response, the attacker sends a disconnect request to the device.


### A.KNX.04 - KNX bus scanning and identification
#### Attack description
The attacker implements line scanning, aiming to discover all KNX devices connected to the KNX bus. For this purpose, the attacker follow the steps bellow:
1. The attacker sends a `Tunnel` Connection Request to the KNX/IP interface.
2. For each Individual Address (IA) that the attacker needs to check (i.e., unique address of the KNX device in the form 1.1.X):
    1. The attacker sends a Tunneling Request (`TunnelReq`) that encapsulates a cEMI connection request (cEMI `L_Data.req` specifying a `TPCI Connect` service). If this message is processed successfully by the KNX/IP gateway, it will reply with a correponding `L_Data.con` message.
    2. Subsequently, the attacker sends a tunneling acknowledgment (`TunnelAck`) message to the `L_Data.con` received by the KNX/IP interface.
    3. Next, the attacker sends a `TunnelReq` that includes a cEMI device description read request (a cEMI `L_Data.req` specifying the `DevDescrRead` ACPI service). If this message is processed successfully by the KNX/IP gateway, it will reply with a correponding `L_Data.con` message.
    4. Subsequently, the attacker replies with a `TunnelAck` message to the `L_Data.con` received by the KNX/IP interface. 
    5. The attacker waits to receive a cEMI acknowledgment (cEMI `L_Data.ind` specifying the TPCI ACK service). If this happens, then the device 1.1.X exists, and the attacker also receives the Device Description Response (cEMI `L_Data.ind` specifying the `DevDescrResp` APCI service). Both messages are acknowledged by `TunnelAck` messages. 
    6. Next, the attacker sends a `TunnelReq` that encapsulates a cEMI acknowledgement (cEMI `L_Data.req` specifying the TPCI ACK service). If this message is processed successfully by the KNX/IP gateway, it will reply with a correponding `L_Data.con` message.
    7. Subsequently, the attacker replies with a `TunnelAck` message to the `L_Data.con` received by the KNX/IP interface.
    8. The attacker sends a `TunnelReq` that encapsulates a cEMI disconnection request (cEMI `L_Data.req` specifying a `TPCI Disconnect` service). If this message is processed successfully by the KNX/IP gateway, it will reply with a correponding `L_Data.con` message.
    9. Subsequently, the attacker replies with a `TunnelAck` message to the `L_Data.con` received by the KNX/IP interface.
3. When all individual addresses are scanned, the attacker sends a tunnel disconnect request to the KNX/IP interface. 

#### Implementation details
The source code for this attack is in the `knx-03-scanning.py` script. The script attempts the procedure descibed above for all devices from `1.1.1` to `1.1.255`. The script uses dedicated functions, provided by the BOF framework, to send the various requests described above. However, each of these functions (`connect_request_tunneling()`, `cemi_connect()`, `tunneling_request()`, `cemi_dev_descr_read()`) actually creates a `KNXPacket` structure, that is based on Scapy and can easily be manipulated. For example, you can replace any of these functions with their source code, and modify it accordingly.


### A.KNX.05 - Flooding DoS with valid packets
#### Attack description
The attacker aims to overwhelm the victim KNX device by sending multiple valid KNX messages in the form of Heatbeats (i.e., GroupValueWrite messages at 0/0/2). 
#### Implementation details
The attack is implemented in the `knx-04-flooding-valid.py` script. Inside an infinite loop:
1. The attacker sends a Tunnel Connection Request to the KNX/IP interface.
2. Given a positive reply, the attacker sends a Tunneling Request (`TunnelReq`) that encapsulates a cEMI `GroupWriteValue` message. The message is addressed to 0/0/2 with the value of `1` (this indicates a heartbeat).
3. Upon receiving an `L_Data.con` confirmation, the attacker sends a tunneling acknowledgment (`TunnelAck`).
4. The attacker sends a tunneling disconnect request, to terminate the tunneling session.
5. Immediately, the attacker starts the same procedure by going to step 1.


### A.KNX.06 - Flooding DoS with partially invalid packets
#### Attack description
The attacker aims to overwhelm the victim KNX device by sending partially invalid KNX messages, in the form of Heatbeats (i.e., GroupValueWrite messages with payload `1`), by randomly altering the source and destination address.  
#### Implementation details
The attack is implemented in the `knx-05-flooding-invalid.py` script. Inside an infinite loop:
1. The attacker chooses a random source and destination address. 
2. The attacker sends a Tunnel Connection Request to the KNX/IP interface.
3. Given a positive reply, the attacker sends a Tunneling Request (`TunnelReq`) that encapsulates a cEMI `GroupWriteValue` message. The message is addressed to the random destination address with a random payload.
4. Upon receiving an `L_Data.con` confirmation, the attacker sends a tunneling acknowledgment (`TunnelAck`).
5. The attacker sends a tunneling disconnect request, to terminate the tunneling session.
6. Immediately, the attacker starts the same procedure by going to step 1.
