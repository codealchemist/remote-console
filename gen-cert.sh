mkdirp -p cert
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout cert/server.key -out cert/server.cert
echo Self signed certificate created
echo
