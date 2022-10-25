#!/usr/bin/env python3

import socket

TX_UDP_IP = "127.255.255.255"
TX_UDP_PORT = 55101

a = bytearray.fromhex("0f826e6c0260476493100cc603ed9232")
ab = bytearray.fromhex("0f826e6c0260476493100cc603ed92324204c3a1f2394b23a2954a75386a14f0")

txsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
txsock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

txsock.sendto(ab, (TX_UDP_IP, TX_UDP_PORT))

txsock.close()
