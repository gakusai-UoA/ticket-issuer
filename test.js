var canvas = document.getElementById('canvas');
var printer = null;
var ePosDev = new epson.ePOSDevice();
ePosDev.connect('192.168.100.18', 8008, cbConnect);
function cbConnect(data) {
    if(data == 'OK' || data == 'SSL_CONNECT_OK') {
        ePosDev.createDevice('local_printer', ePosDev.DEVICE_TYPE_PRINTER,
                              {'crypto':false, 'buffer':false}, cbCreateDevice_printer);
    } else {
        console.log(data);
    }
}
function cbCreateDevice_printer(devobj, retcode) {
    if( retcode == 'OK' ) {
        printer = devobj;
        printer.timeout = 60000;
        printer.onreceive = function (res) { console.log(res.success); };
        printer.oncoveropen = function () { console.log('coveropen'); };
        print();
    } else {
        console.log(retcode);
    }
}

function print() {
    printer.addTextAlign(printer.ALIGN_CENTER);
    printer.addTextFont(printer.FONT_A);
    printer.addTextLang('ja');
    printer.addTextStyle(true, true, true, printer.COLOR_1);
    printer.addTextSize(3, 3);
    printer.addFeedLine(3);
    printer.addText('蒼翔祭2025\n');
    printer.addTextSize(2, 2);
    printer.addText('100円チケット\n');
    printer.addFeedLine(3);
    printer.addTextStyle(false, false, false, printer.COLOR_1);
    printer.addTextSize(1, 1);
    printer.addSymbol('tc0303eb5-e3f2-417d-9a28-6b8bfd7e442e', printer.SYMBOL_QRCODE_MODEL_2, printer.LEVEL_DEFAULT, 10, 0, 1000);
    printer.addFeedLine(5);
    printer.addText('発行者:20代男性\n');
    printer.addText('発行場所:西受付\n');
    printer.addText('発行時刻:2025/10/12 23:59\n');
    printer.addFeedLine(3);
    printer.addCut(printer.CUT_FEED);
    printer.send();
}