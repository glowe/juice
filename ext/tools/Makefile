all: v8

v8: shell.cc
	g++ -g -Wall -o v8 -lv8_g -pthread shell.cc

clean:
	-rm v8
