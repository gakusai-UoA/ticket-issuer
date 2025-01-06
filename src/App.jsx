import { useState, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import "./App.css";

function App() {
  const [issuePlace, setIssuePlace] = useState(
    Cookies.get("issuePlace") || "西受付"
  );
  const [issuer, setIssuer] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState(
    Cookies.get("ipAddress") || "192.168.0.1"
  );
  const [timeout, setTimeout] = useState(60000); // タイムアウトの状態変数を追加
  const inputRef = useRef(null);
  const staffIdRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [idIdentified, setIdIdentified] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [ticketCount, setTicketCount] = useState(1); // チケット枚数の状態変数を追加
  const [isConnecting, setIsConnecting] = useState(false);
  const ePosDevice = useRef();
  const printer = useRef();
  const STATUS_CONNECTED = "Connected";

  useEffect(() => {
    // フォーカスをテキストボックスに当てる
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBlur = () => {
    // フォーカスが外れたら再度フォーカスを当てる
    if (inputRef.current && !isModalOpen) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (printer.current) {
      setIsModalOpen(false);
      setIsConnecting(false);
    }
  }, [printer.current]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    console.log(value);

    // 入力が36文字になったら印刷ボタンを押せる様にする
    if (value.length === 37) {
      if (value.charAt(0) === "g") {
        setOwnerId(value);
        setIdIdentified(true);
      } else {
        setResultMessage(
          "入場QRでない値が入力されました。スタッフIDや100円チケットを読み込んでいませんか？正しく読み込んだのにこれが起こっている場合は、システム管理者までお問い合わせください。"
        );
        setIsMessageModalOpen(true);
      }
    } else {
      if (value.length >= 37) {
        setInputValue("");
      }
    }
  };

  const handleModalSubmit = () => {
    Cookies.set("ipAddress", ipAddress, { expires: 7 });
    Cookies.set("issuePlace", issuePlace, { expires: 7 });
    setInputValue(""); // テキストボックス内の値を消す
    if (inputRef.current) {
      inputRef.current.focus(); // テキストボックスにフォーカスを当てる
    }
    setConnectionStatus("プリンターに接続しています...");
    if (!ipAddress) {
      setResultMessage(
        "プリンターに接続できませんでした。プリンターのIPアドレスが設定されていません。"
      );
      setIsMessageModalOpen(true);
      setIsLoading(false);
      setIdIdentified(false);
      return;
    }
    connect();
    setIsConnecting(true);
  };

  const setupPrinterCallbacks = () => {
    const prn = printer.current;
    if (!prn) return;

    prn.onreceive = (res) => {
      if (res.success) {
        console.log("Print job completed successfully");
      } else {
        console.error(`Print job failed with code: ${res.code}`);
      }
      setIsLoading(false);
      setIdIdentified(false);
    };

    prn.onerror = (err) => {
      console.error(`Printer error: ${err.status}`);
      setIsLoading(false);
      setIdIdentified(false);
    };
  };

  async function doPrint() {
    setInputValue("");
    setIsLoading(true);

    const d = new Date();
    const issuedTime = d.toLocaleString();
    setCurrentTime(issuedTime);
    setConnectionStatus("チケットをサーバーで処理しています...");

    // チケット作成のためのPOSTリクエスト
    const response = await fetch(
      "https://api.100ticket.soshosai.com/tickets/createTicket",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: ownerId,
          issuer: issuer,
          issuedPlace: issuePlace,
          issuedTime: issuedTime,
          ticketCount: ticketCount,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const tickets = data.map((ticket) => {
        let userState = "";
        switch (ticket.AgeRange) {
          case "pre-sc":
            userState = "未就学児";
            break;
          case "els":
            userState = "小学生";
            break;
          case "jhs":
            userState = "中学生";
            break;
          case "hs":
            userState = "高校生";
            break;
          case "cs":
            userState = "大学生";
            break;
          case "10s":
            userState = "10代";
            break;
          case "20s":
            userState = "20代";
            break;
          case "30s":
            userState = "30代";
            break;
          case "40s":
            userState = "40代";
            break;
          case "50s":
            userState = "50代";
            break;
          case "60s":
            userState = "60代";
            break;
          case "70s":
            userState = "70代";
            break;
          case "80s+":
            userState = "80代以上";
            break;
          case "no-answer":
            userState = "無回答";
            break;
          default:
            userState = "その他";
            break;
        }

        if (ticket.Gender === "male") {
          userState += "男性";
        } else if (ticket.Gender === "female") {
          userState += "女性";
        } else {
          userState += "無回答";
        }

        return {
          ticketId: ticket.TicketId,
          issuer: issuer,
          issuedPlace: issuePlace,
          currentTime: issuedTime,
          userState: userState,
        };
      });

      await print(tickets);
    } else {
      if (response.status === 404) {
        setResultMessage(
          "グループが見つかりませんでした。\n該当のグループを呼び止め、システム管理者を呼んでください。"
        );
      } else {
        setResultMessage("チケットを作成できませんでした。");
      }
      setIsMessageModalOpen(true);
      console.log("Failed to create ticket");
      setIsLoading(false);
      setIdIdentified(false);
    }
  }

  const connect = () => {
    setConnectionStatus("プリンターに接続しています...");

    if (!ipAddress) {
      setResultMessage(
        "プリンターに接続できませんでした。プリンターのIPアドレスが設定されていません。"
      );
      setIsMessageModalOpen(true);
      setIsLoading(false);
      setIdIdentified(false);
      return;
    }
    let ePosDev = new window.epson.ePOSDevice();
    ePosDevice.current = ePosDev;

    ePosDev.connect(ipAddress, 8008, (data) => {
      if (data === "OK") {
        ePosDev.createDevice(
          "local_printer",
          ePosDev.DEVICE_TYPE_PRINTER,
          { crypto: true, buffer: false },
          (devobj, retcode) => {
            if (retcode === "OK") {
              printer.current = devobj;
              printer.current.timeout = timeout; // タイムアウトを設定
              setConnectionStatus(STATUS_CONNECTED);
              setupPrinterCallbacks();
            } else {
              throw retcode;
            }
          }
        );
      } else {
        throw data;
      }
    });
  };

  const print = async (tickets) => {
    setConnectionStatus("印刷しています...");
    let prn = printer.current;
    if (!prn) {
      tickets.forEach(async (ticket) => {
        let response = await fetch(
          "https://api.100ticket.soshosai.com/tickets/deleteTicket",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ticketId: ticket.ticketId,
            }),
          }
        );
        if (response.ok) {
          setResultMessage(
            "プリンターに接続できませんでした。解決しない場合は、システム管理者を呼んでください。"
          );
          setIsMessageModalOpen(true);
          setIsLoading(false);
          setIdIdentified(false);
        } else {
          setResultMessage(
            "プリンターに接続できませんでした。内部処理に失敗しました。以下のIDをシステム管理者にお伝えください。ID:" +
              ticket.ticketId
          );
          setIsMessageModalOpen(true);
          setIsLoading(false);
          setIdIdentified(false);
        }
      });
      return;
    }

    tickets.forEach((ticket) => {
      prn.addTextAlign(prn.ALIGN_CENTER);
      prn.addTextFont(prn.FONT_A);
      prn.addTextLang("ja");
      prn.addTextStyle(true, true, true, prn.COLOR_1);
      prn.addTextSize(3, 3);
      prn.addFeedLine(3);
      prn.addText("蒼翔祭2025\n");
      prn.addTextSize(2, 2);
      prn.addText("100円チケット\n");
      prn.addFeedLine(3);
      prn.addTextStyle(false, false, false, prn.COLOR_1);
      prn.addTextSize(1, 1);
      prn.addSymbol(
        ticket.ticketId,
        prn.SYMBOL_QRCODE_MODEL_2,
        prn.LEVEL_DEFAULT,
        10,
        0,
        1000
      );
      prn.addFeedLine(2);
      prn.addText(`チケットID:${ticket.ticketId}\n`);
      prn.addFeedLine(2);
      prn.addText(`発行者:${ticket.issuer}\n`);
      prn.addText(`発行場所:${ticket.issuedPlace}\n`);
      prn.addText(`発行時刻:${ticket.currentTime}\n`);
      prn.addText(`使用者属性:${ticket.userState}\n`);
      prn.addFeedLine(3);
      prn.addCut(prn.CUT_FEED);
    });

    prn.send();
  };

  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-semibold mb-4">設定</h2>
            <label className="block mb-4">
              IPアドレス:
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="border p-2 w-full mt-1 rounded"
              />
            </label>
            <label className="block mb-4">
              発行場所:
              <select
                value={issuePlace}
                onChange={(e) => setIssuePlace(e.target.value)}
                className="border p-2 w-full mt-1 rounded"
              >
                <option value="西受付">西受付</option>
                <option value="正面受付">正面受付</option>
              </select>
            </label>
            <label className="block mb-4">
              担当者ID:
              <input
                type="text"
                value={issuer}
                ref={staffIdRef}
                onChange={(e) => setIssuer(e.target.value)}
                className="border p-2 w-full mt-1 rounded"
              />
            </label>
            <button
              onClick={handleModalSubmit}
              className="mt-4 p-2 bg-blue-500 text-white rounded w-full"
            >
              {isConnecting ? "接続中..." : "設定する"}
            </button>
          </div>
        </div>
      )}

      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-semibold mb-4">
              印刷に失敗しました。
            </h2>
            <label className="block mb-4">{resultMessage}</label>
            <button
              onClick={() => {
                setIsMessageModalOpen(false);
                setInputValue(""); // テキストボックス内の値を消す
                if (inputRef.current) {
                  inputRef.current.focus(); // テキストボックスにフォーカスを当てる
                }
              }}
              className="mt-4 p-2 bg-red-500 text-white rounded w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div
          className="flex justify-center items-center h-screen"
          aria-label="読み込み中"
        >
          <div className="flex flex-col justify-center items-center">
            <div className="animate-ping h-10 w-10 bg-gray-800 rounded-full m-5"></div>
            <a className="text-3xl m-5">印刷処理中...</a>
            <a
              className={`text-3xl m-5 transition-opacity duration-500 ${
                connectionStatus ? "opacity-100" : "opacity-0"
              }`}
            >
              {connectionStatus}
            </a>
            <button
              onClick={() => {
                setIsMessageModalOpen(false);
                setInputValue(""); // テキストボックス内の値を消す
                if (inputRef.current) {
                  inputRef.current.focus(); // テキストボックスにフォーカスを当てる
                }
              }}
              className="mt-4 p-2 bg-red-500 text-white rounded w-full"
            >
              印刷完了
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center h-screen">
          <a className="text-3xl m-5">蒼翔祭2025</a>
          <a className="text-3xl m-5">100円チケットを印刷する</a>

          {/* 見えないテキストボックス */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
          />
          <label className="block mb-4">
            チケット枚数:
            <input
              type="number"
              value={ticketCount}
              onChange={(e) => setTicketCount(Number(e.target.value))}
              className="border p-2 w-full mt-1 rounded"
              min="1"
            />
          </label>
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
          <a className="text-xl text-red-500">
            料金を受け取る前にこの画面を操作しないでください。
          </a>
          <a className="text-xl text-red-500">
            料金の受け渡しは必ず複数人で行なってください。
          </a>
        </div>
      )}

      <button
        className="fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-8 p-6 bg-red-500 text-white rounded text-xl"
        onClick={() => {
          setIsModalOpen(true);
          if (staffIdRef.current) {
            staffIdRef.current.focus(); // 担当者設定にフォーカスを当てる
          }
        }}
      >
        担当者変更
      </button>
    </>
  );
}

export default App;
