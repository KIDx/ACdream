mongodump -h localhost -d acdream_db -o ~/
MONGO='mongo admin'
$MONGO<<EOF
db.runCommand( { logRotate : 1 } )
exit;
EOF
find /var/log/mongodb/ -mtime +1 -name "mongod.log.*" -exec rm -rf {} \;
