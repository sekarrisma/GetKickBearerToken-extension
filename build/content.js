"use strict";let cookie=document.cookie.split("; ").find(e=>e.startsWith("session_token="));if(cookie){let e=decodeURIComponent(cookie.split("=")[1]);chrome.runtime.sendMessage({session_token:e})}
