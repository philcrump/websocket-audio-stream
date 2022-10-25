#!/usr/bin/env python3

# Temporary Adaptor until Deno adds SO_REUSEADDR for UDP sockets in https://github.com/denoland/deno/pull/13849

import socket

RX_UDP_IP = "127.255.255.255"
RX_UDP_PORT = 5555

TX_UDP_IP = "127.255.255.255"
TX_UDP_PORT = 5556

rxsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
rxsock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
rxsock.bind((RX_UDP_IP, RX_UDP_PORT))

txsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
txsock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

try:
	while True:
		data, addr = rxsock.recvfrom(32768)
		txsock.sendto(data, (TX_UDP_IP, TX_UDP_PORT))

except:
	rxsock.close()
	txsock.close()
