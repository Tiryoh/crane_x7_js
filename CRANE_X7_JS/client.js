var socket  =   io();

//server���Ə������L���邽�߂�flag list
var state   =   {
    on      :   0,
    off     :   0,
    send    :   0,
    set     :   0,
    move    :   0
};

function SendCommand(command,data,slot){
    socket.emit('command', {
        value   : command,
        deg     : data,
        num     : slot
    });
    data = null;
};

function servoON(){
    copyflag    =   0;
    state.set   =   0;
    state.move  =   0;
    state.on    =   1;
    state.off   =   0;
    socket.emit('send',state);
    SendCommand('on','1');
}

function servoOFF(){
    state.set   =   0;
    state.move  =   0;
    state.on    =   0;
    state.off   =   1;
    socket.emit('send',state);
    SendCommand('off','0');
}

//�����Đ��̃f�[�^�ǂݍ��݂ƊJ�n�p���܂ł̐���
function text_data(){
    $.get('copy.txt',function(data, err){
        var frame = data.split('\n');
        Read(frame[0].split(','));
        setTimeout(function(){
            frame_data(1,frame);
        },4000);
    });
}

//�����Đ�
function frame_data(frame_num,frame){
    if(frame_num >= frame.length-2){
        state.set   =   0;
        state.move  =   0;
        state.on    =   0;
        state.off   =   0;
        socket.emit('send',state);
        var loop    =   $('[id=loop]').prop('checked');
        if(loop){
            text_data();
        }
        return;
    }else{
        frame_num++;
    }
    var num = frame[frame_num].split(',');

    for(var j=0;j<num.length;j++){
        set_data(j,num[j]);
    }
    SendCommand('set',num);
    state.move  =   1;
    state.set   =   1;
    state.on    =   1;
    state.off   =   0;
    socket.emit('send',state);

    setTimeout(function(){
        frame_data(frame_num,frame)
    },20);
}

//���@�̎p������
function servoSET_delay(time, deg, goal){
    copyflag        =   0;
    var goal_time   =   1000;

    if(time > goal_time){
        time        =   0;
        state.set   =   0;
        state.move  =   0;
        state.on    =   1;
        state.off   =   0;
        socket.emit('send',state);
        return;
    }

    for(var i=0; i<=7; i++){
        var dif =   (goal[i]-deg[i])*time/goal_time;
        ref[i]  =   Number(deg[i])+dif;
        set_data(i,ref[i]);
    }
    SendCommand('set',ref);

    state.set   =   1;
    state.move  =   1;
    state.on    =   1;
    state.off   =   0;
    socket.emit('send',state);

    setTimeout(function(){
        servoSET_delay(time+10, deg, goal);
    },20);
}

//point-to-point�̍Đ�
let deg     =   [];
var frame   =   0;
var ref     =   [];
function MotionPlayBack(time,deg){
    var data        =   $('[id=select]').val();
    var goal_time   =   500;
    if(data == null){
        state.set   =   0;
        state.move  =   0;
        state.on    =   0;
        state.off   =   0;
        socket.emit('send',state);
        return;
    }

    if(time > goal_time){
        frame++;
        time    =   0;
        deg     =   data[frame-1].split(',');
    }
    if(frame==data.length){
        frame       =   0;
        var loop    =   $('[id=loop]').prop('checked');
        if(loop){
            deg = get_rot_data();
            MotionPlayBack(0,deg);
        }else{
            state.set   =   0;
            state.move  =   0;
            state.on    =   0;
            state.off   =   0;
            socket.emit('send',state);
        }
        return;
    }
    if(frame==0){
        deg =   deg;
        ref =   [];
    }

    goal = data[frame].split(',');
    for(var i=0; i<=7; i++){
        var dif =   (goal[i]-deg[i])*time/goal_time;
        ref[i]  =   Number(deg[i])+dif;
        set_data(i,ref[i]);
    }
    SendCommand('set',ref);
    state.move  =   1;
    state.set   =   1;
    state.on    =   1;
    state.off   =   0;
    socket.emit('send',state);

    setTimeout(function(){
        MotionPlayBack(time+10,deg);
    },20);
}

//���@�ƃ��f���̓�������
function CopyPlay(){
    if(copyflag == 0) return;

    var save = $('[id=copybox]').prop('checked');

    SendCommand('copy', deg, save);

    socket.once('read', function(ref){
        set_list(ref);
    });

    setTimeout(function(){
        CopyPlay();
    },20);
}

//���݂̎��@�̎p���̎擾
var read_count  =   0;
function Read(goal){
    if(read_count >= 2){
        if(deg.length != 8){
            deg = get_rot_data();
        }
        servoSET_delay(0, deg, goal);
        read_count = 0;
        return;
    }
    if(goal.length != 8) return;

    SendCommand('copy',deg);
    socket.once('read', function(ref){
        deg = ref;
        if(ref != null)read_count++;
        return;
    });

    setTimeout(function(){
        Read(goal);
    },20);
}

function Move(){
    copyflag = 0;

    if(read_count >= 2){
        if(deg.length != 8){
            deg     =   get_rot_data();
        }
        MotionPlayBack(0,deg);
        var data    =   $('[id=select]').val();
        var path    =   $('[id=slot]').val();
        read_count  =   0;
        deg         =   [];
        SendCommand('move',data,path);
        return;
    }

    SendCommand('copy',deg);

    socket.once('read', function(ref){
        deg = ref;
        if(ref != null)read_count++;
        return;
    });

    setTimeout(function(){
        Move();
    },20);
}

var copyflag = 0;
function copy_flag(){
    if(copyflag == 1){
        copyflag    =   0;
    }else if(copyflag == 0){
        copyflag    =   1;
        CopyPlay();
    }
}

function sendPort(){
    var port_dev    =   document.getElementById('dev').value;
    SendCommand('send',port_connect,port_dev);
    state.send      =   port_connect;
    socket.emit('send',state);
}

//server���œ���̏�Ԃ𐧌�(���l���ł̑��쐧��)
socket.on('state',function(state){
        if(state.send){
            document.getElementById('send').innerText = 'connected';
            $('[id=send]'       ).attr('disabled',true);
        }

        if(state.set){
            $('[id=set]'        ).prop('disabled',true);
        }else{
            $('[id=set]'        ).attr('disabled',false);
        }

        if(state.move){
            $('[id=copy_move]'  ).prop('disabled',true);
            $('[id=copy]'       ).attr('disabled',true);
            $('#slot_list'      ).children().prop('disabled', true);
        }else{
            $('[id=copy_move]'  ).prop('disabled',false);
            $('[id=copy]'       ).attr('disabled',false);
            $('#slot_list'      ).children().prop('disabled', false);
        }

        if(state.on){
            $('[id=on]'         ).prop('disabled',true);
            $('[id=copy]'       ).prop('disabled',true);
            document.getElementById('copy').innerText = 'copy';
            copyflag = 1;
            copy_flag();
        }else{
            $('[id=on]'         ).prop('disabled',false);
        }

        if(state.off){
            $('[id=off]'        ).prop('disabled',true);
            $('[id=copy]'       ).prop('disabled',false);
        }else{
            $('[id=off]'        ).prop('disabled',false);
        }
});

function savetext(){
    $('#select option').attr('selected',true);
    $('#select option').prop('selected',true);
    var data = $('#select').val();
    var path = $('[id=slot]').val();
    SendCommand('move',data, path);
}

$(function(){
    $('[id=on]'         ).click(servoON);
    $('[id=off]'        ).click(servoOFF);
    $('[id=set]'        ).click(function(){
    var goal = $('[id=set]').attr('val').split(',');
        Read(goal);
    });
    $('[id=move]'       ).click(function(){Move();});
    $('[id=copy]'       ).click(copy_flag);
    $('[id=copy_move]'  ).click(text_data);
    $('[id=send]'       ).click(sendPort);
    $('[id=save]'       ).click(savetext);
});

