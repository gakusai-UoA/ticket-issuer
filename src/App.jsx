import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [ticketId, setTicketId] = useState("");
  const [userState, setUserState] = useState("");
  const [issuePlace, setIssuePlace] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [idIdentified, setIdIdentified] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  var printer = null;
  var ePosDev = new window.epson.ePOSDevice();

  useEffect(() => {
    // フォーカスをテキストボックスに当てる
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBlur = () => {
    // フォーカスが外れたら再度フォーカスを当てる
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    // 入力が12文字になったら印刷ボタンを押す
    if (value.length === 12) {
      setOwnerId(inputValue);
      setInputValue("");
      setIdIdentified(true);
    }
  };

  async function doPrint() {
    setIsLoading(true);
    const d = new Date();
    const issuedTime = d.toLocaleString();

    // チケット作成のためのPOSTリクエスト
    const response = await fetch(
      "https://100-ticket-server.a-gakusai.workers.dev/tickets/createTicket",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          OwnerId: ownerId,
          Issuer: "竹尾健",
          IssuedPlace: "西受付",
          IssuedTime: issuedTime,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      setTicketId(data.TicketId); // レスポンスから ticketId を設定

      await ePosDev.connect("192.168.0.1", 8008, cbConnect);
    } else {
      console.log("Failed to create ticket");
      setIsLoading(false);
    }
  }

  async function cbConnect(data) {
    if (data == "OK" || data == "SSL_CONNECT_OK") {
      ePosDev.createDevice(
        "local_printer",
        ePosDev.DEVICE_TYPE_PRINTER,
        { crypto: false, buffer: false },
        cbCreateDevice_printer
      );
    } else {
      console.log(data);
      setIsLoading(false); // エラー時に読み込み中を消す
    }
  }

  async function cbCreateDevice_printer(devobj, retcode) {
    if (retcode == "OK") {
      printer = devobj;
      printer.timeout = 60000;
      printer.onreceive = function (res) {
        console.log(res.success);
        setIsLoading(false);
        setIdIdentified(false);
        setResultMessage("成功");
      };
      printer.oncoveropen = function () {
        console.log("coveropen");
      };
      print(printer);
    } else {
      console.log(retcode);
      setIsLoading(false);
      setIdIdentified(false);
      setResultMessage("失敗");
    }
  }

  async function print(printer) {
    printer.addTextAlign(printer.ALIGN_CENTER);
    printer.addTextFont(printer.FONT_A);
    printer.addTextLang("ja");
    printer.addFeedLine(1);
    printer.addTextStyle(false, false, true, printer.COLOR_1);
    printer.addTextSize(3, 3);
    printer.addText("蒼翔祭2025\n");
    printer.addTextSize(2, 2);
    printer.addText("100円チケット\n");
    printer.addFeedLine(2);
    printer.addTextStyle(false, false, false, printer.COLOR_1);
    printer.addSymbol(
      ticketId,
      printer.SYMBOL_QRCODE_MODEL_2,
      printer.LEVEL_DEFAULT,
      4,
      0,
      1000
    );
    printer.addFeedLine(2);
    printer.addTextSize(1, 1);
    printer.addText(`発行者:${userState}\n`);
    printer.addText(`発行場所:${issuePlace}\n`);
    printer.addText(`発行時刻:${currentTime}\n`);
    printer.addCut(printer.CUT_FEED);
    printer.send();
  }

  return (
    <>
      {isLoading ? (
        <div
          className="flex justify-center items-center h-screen"
          aria-label="読み込み中"
        >
          <div className="flex flex-col justify-center items-center">
            <div className="animate-ping h-10 w-10 bg-gray-800 rounded-full m-5"></div>
            <a className="text-3xl m-5">印刷中...</a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center h-screen">
          <a className="text-3xl m-5">蒼翔祭2025</a>
          <a className="text-3xl m-5">100円券を印刷</a>

          {/* 見えないテキストボックス */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur} // ここに追加
            className="absolute opacity-0 pointer-events-none"
            aria-hidden="true"
          />
          <div className="mt-5">
            {!idIdentified ? (
              <button
                className="border-black text-5xl border-2 p-5 rounded-lg bg-gray-300 cursor-not-allowed opacity-50"
                disabled
              >
                入場者QRを読み込んでください
              </button>
            ) : (
              <button
                onClick={() => {
                  doPrint();
                }}
                className="border-black text-5xl border-2 p-5 rounded-lg"
              >
                印刷する
              </button>
            )}
          </div>
          <a className="text-1xl m-5">前回の印刷結果:{resultMessage}</a>
        </div>
      )}
    </>
  );
}

export default App;
