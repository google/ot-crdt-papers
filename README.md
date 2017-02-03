# Operational Transform and CRDT papers and prototypes

This repository will hold papers Raph Levien is writing on technologies for
collaborative text editing, in particular at the intersection of
Operational Transformation and Conflict-free Replicated Data Types (CRDT's).

It also holds a prototype implementation in JavaScript, using
[socket.io](http://socket.io/).

## Running the prototype collaborative editor

Do `npm install` to install the required Node dependencies, then `node .` to run
the server. Connect any number of clients, then start typing. You can simulate
network lag by enabling an optional "sleep" call in the server.

## Disclaimer

This is not an official Google product.
