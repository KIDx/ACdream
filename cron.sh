mongodump -h localhost -d acdream_db -o ~/
MONGO='mongo admin'
$MONGO<<EOF
db.runCommand( { logRotate : 1 } )
exit;
EOF
ls /var/log/mongodb/ | grep mongod.log. | xargs rm -rf
