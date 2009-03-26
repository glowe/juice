CC := g++
CPPFLAGS := -Wall -g -O3
LIBS :=

all: v8

v8: shell.cc crypt.o os.o util.o
	$(CC) $(CPPFLAGS) -o $@ $(LIBS) -lv8 -lssl $^

install: v8
	install $^ /usr/local/bin

uninstall:
	rm /usr/local/bin/v8

clean:
	-rm v8 *.o

.phony: all clean install uninstall
