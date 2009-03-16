all: v8

v8: shell.cc
	g++ -g -Wall -O3 -o $@ -lv8 -lssl -pthread $^

install: v8
	install $^ /usr/local/bin

uninstall:
	rm /usr/local/bin/v8

clean:
	-rm v8

.phony: all clean install uninstall
