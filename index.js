var express = require("express");
var app = express();

var net = require('net');


var mysql = require('mysql');

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");

var server = require("http").Server(app);
var io = require("socket.io")(server);

var conn = mysql.createConnection({
    host    : 'localhost',
	    user    : 'root',
	    password: '1996', 
	    database: 'db_LTNCB',
	     socketPath: '/opt/lampp/var/mysql/mysql.sock',
	     port: 3036


});

function User()
{
    // Thuộc tính
    this.u_sock_id = '';
    this.gp_id = '';
    this.u_name='';
    this.status=0;
    this.partner_sock_id='';
    this.partner_name='';
    this.partner_map=[];
    this.luocchoi=0;//=1dc ban, =0 k duoc ban
    // Phương thức
    this.setInfo = function(u_id, gp_id, n){
        this.u_sock_id = u_id;
        this.gp_id = gp_id;
        this.u_name=n;
    };

    this.clearInfo = function() {
    	this.status=0;
    	this.gp_id='';
    	this.partner_name = '';
    	this.partner_sock_id = '';
    	this.partner_name=[];
    	this.luocchoi = 0;
    };
     
     
    // Phải return this thì mới tạo mới được đối tượng
    return this;
}

function GP()
{
    // Thuộc tính
    this.u_sock_id = '';
    this.u_name='';
    this.gp_id = '';
    this.gp_name='';
    this.is_verified = 0;
    this.status = 0;
    this.luocchoi=0;//=1dc choi, =0 k duoc choi
    this.socket='';
    // Phương thức
    this.setInfo = function(u_id, gp_id, n,  socket){
        this.u_sock_id = u_id;
        this.gp_id = gp_id;
        this.u_name=n;
        this.socket = socket;
    };

    this.clearInfo = function() {
    	this.u_sock_id='';
    	this.u_name='';
    	this.status=0;
    	this.luocchoi=0;
    };


    // Phải return this thì mới tạo mới được đối tượng
    return this;
    
}


//sinh ra toa do tu dong cho tro choi

function create_map()
{
	var arr=[];
	var done = 0;
	while(done==0) {
		 var td5 = Math.floor((Math.random() * 99) + 1);
		 var dir =  Math.floor((Math.random() * 2) + 0);
		 if(dir==0) {//hang doc
		 	if((td5+40)<100) {
		 		arr.push(td5);
		 		arr.push(5);
		 		arr.push(0);//doc
		 		done =1;
		 	}

		 }
		 else {//hang ngang
		 	if((td5%10)<=6 && td5%10!=0) {
		 		arr.push(td5);
		 		arr.push(5);
		 		arr.push(1);//ngang
		 		done =1;
		 	}	
		 }
	}
	return arr;
   
}


var list_curr_user = [];


server.listen(3000);

io.on("connection", function(socket){

	console.log("Co nguoi ket noi : "+socket.id);
	//socket.emit("xx","Hi");
	//kết nối.

	socket.on("disconnect", function(){
		console.log("Ngat ket noi : "+socket.id);
	       // list_curr_user.splice(list_curr_user.indexOf(socket.Username), 1);
		// socket.Username='';
		// socket.emit("verify-logout");
		// socket.broadcast.emit("list_curr_user", list_curr_user);//"update-list-online", list_curr_user);
	});

	socket.on("Client-send-data", function(data){
		console.log(socket.id+" vua gui du lieu "+data);
		//io.sockets.emit("server send data", data+"888");
		//socket.emit("server send data", data+"888");
		socket.broadcast.emit("server send data", data+"888");
	});


	socket.on("log-out", function(){
		list_curr_user.splice(list_curr_user.indexOf(socket.Username), 1);
		for(var i=0; i<list_curr_gamepad.length; i++) {

			if(list_curr_gamepad[i].u_name==socket.Username) list_curr_gamepad[i].clearInfo();
		}
		socket.Username='';
		socket.luocchoi = 0;

		socket.emit("verify-logout");
		socket.broadcast.emit("list_curr_user", list_curr_user);//"update-list-online", list_curr_user);
	});

	socket.on("select-partner", function(data){//phat lai cho nguoi muon ru
		for(var i=0; i<list_curr_user.length; i++) {
			if(list_curr_user[i].u_name==data) {
				//list_curr_user[i].partner_name = data;
				io.to(list_curr_user[i].u_sock_id).emit("choi-khong", socket.Username);
				//console.log("Co nguoi ru choi : "+list_curr_user[i].u_name);
			}
		}
		for(var i=0; i<list_curr_user.length; i++) {
			if(list_curr_user[i].u_sock_id==socket.id) {
				console.log("Co nguoi ru choi : "+list_curr_user[i].u_name);//.u_name
			}
		}
		
	});



	socket.on("OK-choi", function(data){//ten cua dua no muon choi cung
		console.log("No dong y choi roi kia!");
		for(var i=0; i<list_curr_user.length; i++) {
			if(list_curr_user[i].u_name==data) {
				for(var j=0; j<list_curr_user.length; j++) {
					if(list_curr_user[j].u_sock_id==socket.id) {
						list_curr_user[i].partner_name = list_curr_user[j].u_name;
						list_curr_user[i].status=1;
						list_curr_user[j].partner_name=list_curr_user[i].u_name;
						list_curr_user[j].status=1;
						list_curr_user[i].partner_sock_id=list_curr_user[j].u_sock_id;
						list_curr_user[j].partner_sock_id=list_curr_user[i].u_sock_id;

						//gui thong tin de chon gamepad
						var a = create_map();
						var a_e = create_map();

						list_curr_user[i].partner_map=a_e;
						list_curr_user[j].partner_map=a;

						//Phat lai toa do vua duoc sinh ra cho 2 ben

						io.to(list_curr_user[i].u_sock_id).emit("ds-toa-do", {"ta":a, "dich":a_e});
						io.to(list_curr_user[j].u_sock_id).emit("ds-toa-do", {"ta":a_e, "dich":a});

						//Xac dung luot choi lan dau tien
						var luoc = Math.floor(Math.random() * 2);
						if(luoc==1) {//dua gui yeu cai thong tin nay choi truoc
							//socket.emit("luoc-choi",1);//duoc choi truoc
							
							for(var x=0; x<list_curr_gamepad.length; x++) {
								if(list_curr_gamepad[x].u_sock_id==list_curr_user[j].u_sock_id) {
									list_curr_gamepad[x].luocchoi=1;
								}
								if(list_curr_gamepad[x].u_sock_id==list_curr_user[i].u_sock_id) {
									list_curr_gamepad[x].luocchoi=0;
								}
							}
							socket.emit("luoc-choi-truoc", 1);
						}
						else {//gui thong tin duoc ban truoc cho ben kia???
			
							for(var x=0; x<list_curr_gamepad.length; x++) {
								if(list_curr_gamepad[x].u_sock_id==list_curr_user[j].u_sock_id) {
									list_curr_gamepad[x].luocchoi=0;
								}
								if(list_curr_gamepad[x].u_sock_id==list_curr_user[i].u_sock_id) {
									list_curr_gamepad[x].luocchoi=1;
								}
							}
							io.to(list_curr_user[i].u_sock_id).emit("luoc-choi-truoc", 1);
						}
					}
				}
				
			}
		}

		io.sockets.emit("list_curr_user", list_curr_user);
	});

	socket.on("K-Choi", function(data){
		console.log("No k choi kia!");
	});

	socket.on("end-game", function(data){
		//thiet lap lai trang thai ban dau
		for(var i=0; i<list_curr_user.length; i++) {
			list_curr_user[i].clearInfo();
		}
		for(var i=0; i<list_curr_gamepad.length; i++) {
			list_curr_gamepad[i].clearInfo();
		}

		//gui lai danh sach so nguoi hien dang online cho nhung nguoi khac
		io.sockets.emit("list_curr_user", list_curr_user);
			   //  		//io.sockets.emit("list_curr_gp", list_curr_gamepad);
		io.sockets.emit("list_curr_gp", list_curr_gamepad);
		io.sockets.emit("game-finished");
	});

	socket.on("select-it", function(data){
		console.log("chon gamepad nay!"+data+" boi:"+socket.Username);
		for(var i=0; i<list_curr_gamepad.length; i++) {
			if(list_curr_gamepad[i].gp_id==data) {
				for(var j=0; j<list_curr_user.length; j++) {
					if(list_curr_user[j].u_sock_id==socket.id) {
						list_curr_gamepad[i].u_sock_id = socket.id;//list_curr_user[j].u_sock_id;
						list_curr_gamepad[i].status = 1;
						list_curr_gamepad[i].u_name = list_curr_user[j].u_name;
					}
				}
			}
		}
		io.sockets.emit("list_curr_gp", list_curr_gamepad);

	});

	socket.on("correct", function(data){
		for(var j=0; j<list_curr_user.length; j++) {
					if(list_curr_user[j].u_sock_id==socket.id) {
						io.to(list_curr_user[j].partner_sock_id).emit("bi-ban-trung", data);
						//gui ve cho dua ban trung va dua ban trung o day???
						for(var h=0; h<list_curr_gamepad.length; h++) {

							if(list_curr_gamepad[h].u_sock_id==socket.id) {
								list_curr_gamepad[h].socket.write("bantrung.");

							}

							if(list_curr_gamepad[h].u_sock_id==list_curr_user[j].partner_sock_id) {
								list_curr_gamepad[h].socket.write("bibantrung.");

							}

						}
					}
				}
	});

	socket.on("incorrect", function(data){
		for(var j=0; j<list_curr_user.length; j++) {
					if(list_curr_user[j].u_sock_id==socket.id) {
						io.to(list_curr_user[j].partner_sock_id).emit("ban-khong-trung", data);
					}
				}
	});

	socket.on("luoc-choi", function(data){
		for(var j=0; j<list_curr_gamepad.length; j++) {
			if(list_curr_gamepad[j].u_sock_id==socket.id) {
				if(data==1) {
					list_curr_gamepad[j].luocchoi=1;
					for(var k=0; k<list_curr_user.length; k++) {
						if(list_curr_user[k].u_sock_id==list_curr_gamepad[j].u_sock_id) {
							for(var h=0; h<list_curr_gamepad.length; h++) {
								if(list_curr_gamepad[h].u_sock_id==list_curr_user[k].partner_sock_id) {
									list_curr_gamepad[h].luocchoi=0;
								}
							}
						}
					}
				}
				else {

					list_curr_gamepad[j].luocchoi=0;
					//gui luoc choi qua cho ben kia?
					for(var k=0; k<list_curr_user.length; k++) {
						if(list_curr_user[k].u_sock_id==list_curr_gamepad[j].u_sock_id) {
							console.log("CO vao trong ban k trung"+list_curr_gamepad[j].u_sock_id+" k:"+list_curr_user[k].partner_name);
							for(var h=0; h<list_curr_gamepad.length; h++) {
								console.log("li gp h : "+list_curr_gamepad[h].u_sock_id);
								if(list_curr_gamepad[h].u_name==list_curr_user[k].partner_name) {
									list_curr_gamepad[h].luocchoi=1;
								}
							}
						}
					}

					//io.to(list_curr_user[i].partner_sock_id).emit("toi-luoc-ban", 1);
					
					
				}
			}
		}
	});

	// socket.on("toi-luoc-toi", function(data){
	// 	console.log("Toi luoc cua toi");
	// 	for(var j=0; j<list_curr_gamepad.length; j++) {
	// 		if(list_curr_gamepad[j].u_sock_id==socket.id) {
	// 			list_curr_gamepad[j].luocchoi=1;
	// 		}
	// 	}
	// });

	socket.on("dang-nhap", function(data){
		conn.connect(function (err){
		    //nếu có nỗi thì in ra
		   // if (err) throw err.stack;
		    //nếu thành công
		    var f=0;
		    var sql = "SELECT * FROM USER";
		    
		    conn.query(sql, function (err,results, fields) {

		        if (err) throw err;
		        console.log("xxx");
		        for(var i=0; i<results.length; i++)
		        // console.log(results[i]['username']);
		     	if(results[i]['username']==data.u_name && results[i]['pass']==data.pass) {
		     		console.log("xxx");

		    		for (var j = 0; j < list_curr_user.length; j++){
					    //document.write(name_array[i]);
					    if(list_curr_user[j].u_name==data.u_name) {
					    	socket.emit("server send verify login", {"status":"ERR", "info":" Tai khoan nay dang dang nhap"});
					    	f=1;
					    }
					}

					if(f!=1) {
						socket.Username=data.u_name;
			     		var user = new User();
						 user.setInfo(socket.id, '',data.u_name);
			     		socket.emit("server send verify login", {"status":"OK", "info":data.u_name});
			     		//list_curr_user.push(data.u_name);
			     		list_curr_user.push(user);
			   //  		//gui lai danh sach so nguoi hien dang online cho nhung nguoi khac
			     		io.sockets.emit("list_curr_user", list_curr_user);
			   //  		//io.sockets.emit("list_curr_gp", list_curr_gamepad);
			     		io.sockets.emit("list_curr_gp", list_curr_gamepad);
			    		break;
					}
					else {
						f=0;
					}
		    		
		    	}
		    	
		    });

		});
	});


	socket.on("dang-ky", function(data){
		console.log(data.u_name);
		console.log(data.email);
		console.log(data.pass);

		conn.connect(function (err){
		    //nếu có nỗi thì in ra
		    //if (err) throw err.stack;
		    //nếu thành công
		    var sql = "SELECT * FROM USER";
		    var is_esixst = 0;
		    conn.query(sql, function (err,results, fields) {
		        if (err) throw err;
		        for(var i=0; i<results.length; i++)
		        //console.log(results[i]['username']);
		    	if(results[i]['username']==data.u_name || results[i]['email']==data.email) {
		    		socket.emit("server send verify", {"status":"ERR", "info":"Ten hoac email nay da ton tai!"});
		    		is_esixst = 1;
		    		break;
		    	}
		    	if(is_esixst!=1) {
		    		//Xu ly  them vao csdl o day

				var sql1 = "INSERT INTO USER (id_u, email, username, pass) VALUES ('','"+data.email+"','"+data.u_name+"','"+ data.pass+"')";
		    		 console.log(sql1);
					  conn.query(sql1, function (err, result, fields) {
					    if (err) throw err;
					    console.log("1 dong vua duoc chen vao");
					  });
					  var user = new User();
						user.setInfo(socket.id, '',data.u_name);
					  list_curr_user.push(user);
		    		socket.emit("server send verify", {"status":"OKK", "info":"Tao tai khoan thanh cong", "n":data.u_name});
				socket.emit("server send verify login", {"status":"OK", "info":data.u_name});
		    		io.sockets.emit("list_curr_user", list_curr_user);
				io.sockets.emit("list_curr_gp", list_curr_gamepad);
		    		is_esixst=0;
		    	}
		    });

		});

		// socket.emit("server send verify", "OKK");
	});

});

app.get("/", function(req, res){
	//console.log("esp ket noi");
	res.render("trangchu");
});

///// Ket noi cua Esp

var list_curr_gamepad =[];
//var list_curr_gamepad =[];

// Configuration parameters
var HOST = '0.0.0.0';
var PORT = 6789;
 
// Create Server instance 
var server_raw = net.createServer(onClientConnected);  

 
server_raw.listen(PORT, HOST, function() {  
  console.log('server listening on %j', server_raw.address());
});
 
function onClientConnected(sock) {  
  var is_key = false;//chua nhan nut'
  var gp = new GP();
  var remoteAddress = sock.remoteAddress + ':' + sock.remotePort;
  gp.gp_id = remoteAddress;
  gp.socket = sock;
  gp.socket.write("Nhan duoc du lieu bang bien phuj.");
  list_curr_gamepad.push(gp);//remoteAddress
  //io.sockets.emit("list_curr_gp", list_curr_gamepad);
  console.log('new GamePad connected: %s', remoteAddress);

  
 
  sock.on('data', function(data) {
    console.log('%s Says: %s', remoteAddress, data);
    var name_game_pad = data;
    //console.log("haha : "+name_game_pad);
    //kiem tra xem co phai a gamepad gui du lieu khong
    
    var verify_i = data.slice(0, 6)+'';//verify-ngoc01=>toi da co 100 gamePad ket noi
    //console.log(verify_i+'');
    if(verify_i=='verify') {
    	var n_gp = data.slice(7, 13);
    	console.log("verify"+n_gp);
    	for(var i=0; i<list_curr_gamepad.length; i++) {
    		if(list_curr_gamepad[i].gp_id==remoteAddress) {
    			list_curr_gamepad[i].gp_name = n_gp;
    			//console.log("Ten : "+n_gp);
    			list_curr_gamepad[i].is_verified = 1;
    			io.sockets.emit("list_curr_gp",list_curr_gamepad);

    		}
    	}
    } 
    //nguoc lai khi gui du kieu len, kiem tra da duoc xac nhan chua vadang thuoc ve nguoi choi nao?
    else {//cat lay ten kiem tra trong mang gamepad, thiet bi nay co ton tai k?
    	//kiem tra xem dang thuoc ve ai khong?   ngoc01:2,3
    	verify_i = data.slice(0, 6)+'';//lay ra ten trong truong hop da xac minh
    	var coordinate='';
    	coordinate = data.slice(7, 8);
    	//// Kiem tra co dung luoc choi khong??

    	for(var i=0; i<list_curr_gamepad.length; i++) {
    		if(list_curr_gamepad[i].is_verified==1) {//list_curr_gamepad[i].gp_name==verify_i && 
    			if(list_curr_gamepad[i].gp_name==verify_i) {
    				console.log("Luot choi : "+list_curr_gamepad[i].luocchoi);
    				if(list_curr_gamepad[i].luocchoi==1) { 


			    		if(coordinate=='6') {//sang phai
				    		console.log("Toa do nhan duoc la : "+coordinate+" - "+verify_i);
				    		for(var ii=0; ii<list_curr_gamepad.length; ii++) {

				    			if(list_curr_gamepad[ii].gp_id==remoteAddress) {
				    				io.to(list_curr_gamepad[ii].u_sock_id).emit("lua-toa-do", 6);
				    				console.log("Co chay vao ,,,");
				    			}
				    		}
				    	}
				    	else if(coordinate=='4') {//sang trai
				    		console.log("Toa do nhan duoc la : "+coordinate+" - "+verify_i);
				    		for(var ii=0; ii<list_curr_gamepad.length; ii++) {

				    			if(list_curr_gamepad[ii].gp_id==remoteAddress) {
				    				io.to(list_curr_gamepad[ii].u_sock_id).emit("lua-toa-do", 4);
				    				console.log("Co chay vao ,,,");
				    			}
				    		}
				    	}
				    	else if(coordinate=='2'){//len
				    		console.log("Toa do nhan duoc la : "+coordinate+" - "+verify_i);
				    		for(var ii=0; ii<list_curr_gamepad.length; ii++) {

				    			if(list_curr_gamepad[ii].gp_id==remoteAddress) {
				    				io.to(list_curr_gamepad[ii].u_sock_id).emit("lua-toa-do", 2);
				    				console.log("Co chay vao ,,,");
				    			}
				    		}
				    	}
				    	else if(coordinate=='8'){//xuong
				    		console.log("Toa do nhan duoc la : "+coordinate+" - "+verify_i);
				    		for(var ii=0; ii<list_curr_gamepad.length; ii++) {

				    			if(list_curr_gamepad[ii].gp_id==remoteAddress) {
				    				io.to(list_curr_gamepad[ii].u_sock_id).emit("lua-toa-do", 8);
				    				console.log("Co chay vao ,,,");
				    			}
				    		}
				    	}
				    	else if(coordinate=='5'){//ok, xac nhan chon toa do nay
				    		console.log("Toa do nhan duoc la : "+coordinate+" - "+verify_i);
				    		for(var ii=0; ii<list_curr_gamepad.length; ii++) {

				    			if(list_curr_gamepad[ii].gp_id==remoteAddress) {
				    				io.to(list_curr_gamepad[ii].u_sock_id).emit("lua-toa-do", 5);
				    				console.log("Co chay vao ,,,");
				    			}
				    		}
				    	}
    				}
    			}
    		}
    	}


    	
    	
    }


    //list_curr_gamepad.push(name_game_pad);
    
    //io.to("ngid_id").emit("toa-do","x,y");

   // sock.write('Echo : .');
   // sock.write(data+'.');
    
  });
  sock.on('close',  function () {
  	list_curr_gamepad.splice(list_curr_gamepad.indexOf(remoteAddress), 1);
    console.log('connection from %s closed', remoteAddress);
    io.sockets.emit("list_curr_gp", list_curr_gamepad);
  });
  sock.on('error', function (err) {
    console.log('Connection %s error: %s', remoteAddress, err.message);
  });
};
