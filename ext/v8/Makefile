all: v8

v8: shell.cc crypt.o os.o util.o
	g++ -g -Wall -o $@ -lv8 -lssl -pthread $^

install: v8
	install $^ /usr/local/bin

uninstall:
	rm /usr/local/bin/v8

clean:
	-rm v8 *.o

.phony: all clean install uninstall
