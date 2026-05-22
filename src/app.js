import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

const h = React.createElement;
const SHOTS_KEY = "coffee-os:shots";
const TRICKS_KEY = "coffee-os:tricks";

const channelingOptions = ["none", "mild", "severe", "side spray", "late channeling"];
const drinkTypes = ["espresso", "flat white", "latte", "magic", "piccolo", "long black"];

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emptyShot = () => ({
  id: uid(),
  dateTime: nowLocal(),
  roaster: "",
  beanName: "",
  roastDate: "",
  dose: "18",
  grindInner: "6",
  grindOuter: "5",
  preInfusion: "",
  yield: "",
  shotTime: "",
  channeling: "none",
  flowNotes: "",
  tasteNotes: "",
  milk: "",
  drinkType: "flat white",
  trickTried: "",
  rating: "3",
  photoData: "",
  recordedAt: "",
});

const sampleShots = [
  {
    id: "sample-humbler-1",
    dateTime: "2026-05-20T07:42",
    roaster: "Proud Mary",
    beanName: "Humbler Mild",
    roastDate: "2026-05-08",
    dose: "18",
    grindInner: "6",
    grindOuter: "5",
    preInfusion: "6",
    yield: "44",
    shotTime: "27",
    channeling: "mild",
    flowNotes: "A little quick in the middle, even finish.",
    tasteNotes: "Sweet cocoa, slightly thin with milk.",
    milk: "170",
    drinkType: "flat white",
    trickTried: "WDT technique",
    rating: "4",
    photoData: "",
    recordedAt: "2026-05-20T07:48:00.000Z",
  },
  {
    id: "sample-industry-1",
    dateTime: "2026-05-21T07:36",
    roaster: "Industry Beans",
    beanName: "Autumn Espresso",
    roastDate: "2026-05-13",
    dose: "18",
    grindInner: "6",
    grindOuter: "4",
    preInfusion: "5",
    yield: "39",
    shotTime: "24",
    channeling: "late channeling",
    flowNotes: "Looked glossy, then blonded near the end.",
    tasteNotes: "Balanced, a touch sharp.",
    milk: "150",
    drinkType: "magic",
    trickTried: "Stop shot at blonding",
    rating: "4",
    photoData: "",
    recordedAt: "2026-05-21T07:42:00.000Z",
  },
];

const sampleTricks = [
  {
    id: "trick-preinfusion",
    title: "Manual pre-infusion",
    how: "Hold the BES875 button to wet the puck gently before full pressure.",
    when: "Use when shots gush early or taste sharp.",
    result: "Try 5-7 seconds and note whether the first drips look calmer.",
  },
  {
    id: "trick-ristretto",
    title: "Ristretto",
    how: "Pull a shorter yield, around 32-36g from an 18g dose.",
    when: "Use when a milk drink tastes hollow or over-extracted.",
    result: "Look for more body and less bitterness.",
  },
  {
    id: "trick-wdt",
    title: "WDT technique",
    how: "Stir the grounds evenly, then tap once and tamp level.",
    when: "Use when the bottomless portafilter shows side spray or channeling.",
    result: "Track whether the stream forms more centrally.",
  },
];

function loadJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysPostRoast(shot) {
  if (!shot.roastDate || !shot.dateTime) return "";
  const roast = new Date(`${shot.roastDate}T00:00`);
  const pulled = new Date(shot.dateTime);
  const days = Math.floor((pulled - roast) / 86400000);
  return Number.isFinite(days) ? Math.max(days, 0) : "";
}

function brewRatio(shot) {
  const dose = numeric(shot.dose);
  const output = numeric(shot.yield);
  return dose && output ? output / dose : null;
}

function latestFinishedShot(shots) {
  return [...shots]
    .filter((shot) => shot.yield || shot.shotTime || shot.tasteNotes || shot.flowNotes)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
}

function latestPreviousShot(shots, activeShotId) {
  return [...shots]
    .filter(
      (shot) =>
        shot.id !== activeShotId &&
        (shot.yield || shot.shotTime || shot.tasteNotes || shot.flowNotes)
    )
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
}

function latestBeanShot(shots, activeShotId) {
  return [...shots]
    .filter(
      (shot) =>
        shot.id !== activeShotId &&
        (shot.roaster || shot.beanName || shot.roastDate)
    )
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
}

function suggestionFor(shot) {
  if (!shot) return "先记录今天这一杯，明天这里会给你一个小建议。";

  const ratio = brewRatio(shot);
  const time = numeric(shot.shotTime);
  const milk = numeric(shot.milk);
  const taste = (shot.tasteNotes || "").toLowerCase();
  const flow = (shot.flowNotes || "").toLowerCase();

  if (shot.channeling === "severe") {
    return "先把 WDT 和压粉稳定下来，再考虑改研磨。";
  }
  if (shot.channeling === "late channeling") {
    return "下次在水柱开始散掉前，稍微早一点结束萃取。";
  }
  if (ratio && ratio > 2.5) {
    return `下次早一点停，目标大约 ${Math.round((numeric(shot.dose) || 18) * 2.1)}g。`;
  }
  if (time && time < 22) {
    return `外圈研磨可以比 ${shot.grindOuter || "现在"} 再细一点。`;
  }
  if ((time && time > 35) || flow.includes("dripping")) {
    return `外圈研磨可以比 ${shot.grindOuter || "现在"} 再粗一点。`;
  }
  if (milk && milk > 180 && taste.includes("weak")) {
    return "奶量稍微少一点，让咖啡味更撑得起来。";
  }
  if (taste.includes("sour") && ratio && ratio < 2) {
    return "下次稍微拉高一点萃取量，让酸感柔和一点。";
  }
  if (shot.preInfusion === "" || numeric(shot.preInfusion) === 0) {
    return "试试 5-7 秒手动预浸泡，让开头更稳。";
  }
  return `研磨先保持 ${shot.grindOuter || "现在的设置"}，重点放在更均匀的 WDT。`;
}

function formatRatio(shot) {
  const ratio = brewRatio(shot);
  return ratio ? `1:${ratio.toFixed(2)}` : "Pending";
}

function shortShotSummary(shot) {
  if (!shot) return "还没有上一次记录。先记录今天这一杯，明天这里会更聪明。";
  const coffee = [shot.roaster, shot.beanName].filter(Boolean).join(" ");
  const taste = shot.tasteNotes ? ` · ${shot.tasteNotes}` : "";
  return `${coffee || "上一杯"}：${shot.dose || "?"}g in / ${
    shot.yield || "?"
  }g out，${shot.shotTime || "?"}秒，${formatRatio(shot)}${taste}`;
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Photo could not be read"));
    };
    image.src = url;
  });
}

function exportFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(shots) {
  const fields = [
    "dateTime",
    "roaster",
    "beanName",
    "roastDate",
    "dose",
    "grindInner",
    "grindOuter",
    "preInfusion",
    "yield",
    "shotTime",
    "channeling",
    "flowNotes",
    "tasteNotes",
    "milk",
    "drinkType",
    "trickTried",
    "rating",
    "photoIncluded",
    "daysPostRoast",
    "brewRatio",
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = shots.map((shot) =>
    fields
      .map((field) => {
        if (field === "daysPostRoast") return escape(daysPostRoast(shot));
        if (field === "brewRatio") return escape(brewRatio(shot)?.toFixed(2) || "");
        if (field === "photoIncluded") return escape(shot.photoData ? "yes" : "no");
        return escape(shot[field]);
      })
      .join(",")
  );
  return [fields.join(","), ...rows].join("\n");
}

function Field({ label, children, hint }) {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    children,
    hint ? h("small", null, hint) : null
  );
}

function TextInput({ label, value, onChange, type = "text", placeholder, step }) {
  return h(
    Field,
    { label },
    h("input", {
      type,
      value,
      placeholder,
      step,
      onChange: (event) => onChange(event.target.value),
    })
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return h(
    Field,
    { label },
    h("textarea", {
      value,
      placeholder,
      rows: 3,
      onChange: (event) => onChange(event.target.value),
    })
  );
}

function SelectInput({ label, value, onChange, options }) {
  return h(
    Field,
    { label },
    h(
      "select",
      { value, onChange: (event) => onChange(event.target.value) },
      options.map((option) => h("option", { key: option, value: option }, option))
    )
  );
}

function App() {
  const [shots, setShots] = useState(() => {
    const saved = loadJson(SHOTS_KEY, null);
    const source = saved?.length ? saved : sampleShots;
    return source.map((shot) => ({
      ...emptyShot(),
      ...shot,
      id: shot.id || uid(),
      recordedAt: shot.recordedAt || shot.dateTime || new Date().toISOString(),
    }));
  });
  const [draftShot, setDraftShot] = useState(() => emptyShot());
  const [editingShotId, setEditingShotId] = useState(null);
  const [tricks, setTricks] = useState(() => {
    const saved = loadJson(TRICKS_KEY, null);
    return saved?.length ? saved : sampleTricks;
  });
  const [activeView, setActiveView] = useState("log");
  const [importMessage, setImportMessage] = useState("");
  const [recordMessage, setRecordMessage] = useState("");
  const [trickDraft, setTrickDraft] = useState({
    title: "",
    how: "",
    when: "",
    result: "",
  });

  useEffect(() => {
    localStorage.setItem(SHOTS_KEY, JSON.stringify(shots));
  }, [shots]);

  useEffect(() => {
    localStorage.setItem(TRICKS_KEY, JSON.stringify(tricks));
  }, [tricks]);

  const activeShot = draftShot;
  const previousShot = useMemo(() => latestFinishedShot(shots), [shots]);
  const latestBean = useMemo(
    () => latestBeanShot(shots, editingShotId),
    [shots, editingShotId]
  );
  const suggestionShot = previousShot;
  const suggestion = useMemo(() => suggestionFor(suggestionShot), [suggestionShot]);

  const updateShot = (field, value) => {
    setDraftShot((current) => ({ ...current, [field]: value }));
    setRecordMessage("");
  };

  const recordShot = () => {
    const stampedAt = new Date().toISOString();
    const shotToSave = {
      ...activeShot,
      id: editingShotId || activeShot.id || uid(),
      recordedAt: stampedAt,
    };
    setShots((current) => {
      if (editingShotId) {
        return current.map((shot) => (shot.id === editingShotId ? shotToSave : shot));
      }
      return [shotToSave, ...current];
    });
    setDraftShot(emptyShot());
    setEditingShotId(null);
    setRecordMessage("已记录，今天这杯已经存进历史。");
  };

  const reuseLastBean = () => {
    if (!latestBean) return;
    setDraftShot((shot) => ({
      ...shot,
      roaster: latestBean.roaster || shot.roaster,
      beanName: latestBean.beanName || shot.beanName,
      roastDate: latestBean.roastDate || shot.roastDate,
    }));
    setRecordMessage("已沿用上次的豆子信息。");
  };

  const useNewBean = () => {
    setDraftShot((shot) => ({
      ...shot,
      roaster: "",
      beanName: "",
      roastDate: "",
    }));
    setRecordMessage("已切换为新豆子，可以重新填写豆子信息。");
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      const photoData = await readPhoto(file);
      updateShot("photoData", photoData);
      setRecordMessage("照片已放进草稿，点“记录”后会一起保存。");
    } catch {
      setRecordMessage("这张照片没有读成功，可以换一张试试。");
    }
  };

  const startFreshShot = () => {
    setDraftShot(emptyShot());
    setEditingShotId(null);
    setRecordMessage("");
    setActiveView("log");
  };

  const removeShot = (id) => {
    setShots((current) => current.filter((shot) => shot.id !== id));
    if (id === editingShotId) {
      setDraftShot(emptyShot());
      setEditingShotId(null);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedShots = Array.isArray(parsed) ? parsed : parsed.shots;
      const importedTricks = parsed.tricks;
      if (!Array.isArray(importedShots)) throw new Error("Missing shots");
      const normalizedShots = importedShots.map((shot) => ({
        ...emptyShot(),
        ...shot,
        id: shot.id || uid(),
        recordedAt: shot.recordedAt || shot.dateTime || new Date().toISOString(),
      }));
      setShots(normalizedShots);
      if (Array.isArray(importedTricks)) {
        setTricks(importedTricks.map((trick) => ({ ...trick, id: trick.id || uid() })));
      }
      setDraftShot(emptyShot());
      setEditingShotId(null);
      setImportMessage("Imported and saved locally.");
    } catch {
      setImportMessage("That file did not look like a Coffee OS JSON export.");
    }
  };

  const addTrick = () => {
    if (!trickDraft.title.trim()) return;
    setTricks((current) => [{ ...trickDraft, id: uid() }, ...current]);
    setTrickDraft({ title: "", how: "", when: "", result: "" });
  };

  const metrics = [
    ["Days post roast", daysPostRoast(activeShot) || "Pending"],
    ["Brew ratio", formatRatio(activeShot)],
    ["Last rating", activeShot.rating ? `${activeShot.rating}/5` : "Pending"],
  ];

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "hero" },
      h(
        "div",
        null,
        h("p", { className: "eyebrow" }, "Breville Barista Express BES875"),
        h("h1", null, "Coffee OS"),
        h(
          "p",
          { className: "subcopy" },
          "A gentle morning log for 54mm basket espresso, bottomless portafilter notes, and slow, steady dial-in progress."
        )
      ),
      h(
        "button",
        { className: "primary-action", onClick: startFreshShot },
        "Start fresh shot"
      )
    ),
    h(
      "section",
      { className: "suggestion-panel", "aria-labelledby": "suggestion-title" },
      h("p", { className: "eyebrow" }, "Today's Dial-In Suggestion"),
      h("div", { className: "last-summary" }, h("span", null, "上次记录"), shortShotSummary(suggestionShot)),
      h("h2", { id: "suggestion-title" }, h("span", null, "建议："), suggestion)
    ),
    h(
      "nav",
      { className: "tabs", "aria-label": "Coffee OS sections" },
      ["log", "history", "tricks"].map((view) =>
        h(
          "button",
          {
            key: view,
            className: activeView === view ? "active" : "",
            onClick: () => setActiveView(view),
          },
          view === "log" ? "Shot log" : view
        )
      )
    ),
    activeView === "log" &&
      h(
        "section",
        { className: "workbench" },
        h(
          "div",
          { className: "form-card" },
          h(
            "div",
            { className: "section-heading" },
            h("h2", null, "Today's espresso"),
            h(
              "div",
              { className: "form-actions" },
              h(
                "button",
                {
                  className: "soft-action",
                  disabled: !latestBean,
                  onClick: reuseLastBean,
                  title: latestBean ? "Use the previous roaster, bean name, and roast date" : "",
                },
                "沿用上次豆子"
              ),
              h("button", { className: "record-action", onClick: useNewBean }, "使用新豆子")
            )
          ),
          h(
            "div",
            { className: "form-grid" },
            h(TextInput, {
              label: "Date/time 日期时间",
              type: "datetime-local",
              value: activeShot.dateTime,
              onChange: (value) => updateShot("dateTime", value),
            }),
            h(TextInput, {
              label: "Roaster 烘豆商",
              value: activeShot.roaster,
              placeholder: "Proud Mary",
              onChange: (value) => updateShot("roaster", value),
            }),
            h(TextInput, {
              label: "Bean name 豆子名称",
              value: activeShot.beanName,
              placeholder: "Humbler Mild",
              onChange: (value) => updateShot("beanName", value),
            }),
            h(TextInput, {
              label: "Roast date 烘焙日期",
              type: "date",
              value: activeShot.roastDate,
              onChange: (value) => updateShot("roastDate", value),
            }),
            h(TextInput, {
              label: "Dose g 粉量",
              type: "number",
              step: "0.1",
              value: activeShot.dose,
              onChange: (value) => updateShot("dose", value),
            }),
            h(TextInput, {
              label: "Yield g 液重",
              type: "number",
              step: "0.1",
              value: activeShot.yield,
              onChange: (value) => updateShot("yield", value),
            }),
            h(TextInput, {
              label: "Grind inner 内圈研磨",
              type: "number",
              value: activeShot.grindInner,
              onChange: (value) => updateShot("grindInner", value),
            }),
            h(TextInput, {
              label: "Grind outer 外圈研磨",
              type: "number",
              value: activeShot.grindOuter,
              onChange: (value) => updateShot("grindOuter", value),
            }),
            h(TextInput, {
              label: "Pre-infusion sec 预浸泡秒数",
              type: "number",
              value: activeShot.preInfusion,
              onChange: (value) => updateShot("preInfusion", value),
            }),
            h(TextInput, {
              label: "Shot time sec 萃取秒数",
              type: "number",
              value: activeShot.shotTime,
              onChange: (value) => updateShot("shotTime", value),
            }),
            h(SelectInput, {
              label: "Channeling 通道效应",
              value: activeShot.channeling,
              options: channelingOptions,
              onChange: (value) => updateShot("channeling", value),
            }),
            h(SelectInput, {
              label: "Drink type 饮品类型",
              value: activeShot.drinkType,
              options: drinkTypes,
              onChange: (value) => updateShot("drinkType", value),
            }),
            h(TextInput, {
              label: "Milk ml 牛奶量",
              type: "number",
              value: activeShot.milk,
              onChange: (value) => updateShot("milk", value),
            }),
            h(TextInput, {
              label: "Rating 1-5 评分",
              type: "number",
              value: activeShot.rating,
              onChange: (value) => updateShot("rating", value),
            })
          ),
          h(TextInput, {
            label: "Trick tried 尝试技巧",
            value: activeShot.trickTried,
            placeholder: "WDT technique",
            onChange: (value) => updateShot("trickTried", value),
          }),
          h(TextArea, {
            label: "Flow notes 流速记录",
            value: activeShot.flowNotes,
            placeholder: "Central pour, a little side spray, blonded late...",
            onChange: (value) => updateShot("flowNotes", value),
          }),
          h(TextArea, {
            label: "Taste notes 风味记录",
            value: activeShot.tasteNotes,
            placeholder: "Sour, weak in milk, sweet cocoa, bitter finish...",
            onChange: (value) => updateShot("tasteNotes", value),
          }),
          h(
            "div",
            { className: "photo-uploader" },
            h(
              "label",
              { className: "photo-button" },
              activeShot.photoData ? "换一张照片 Change photo" : "上传咖啡照片 Upload photo",
              h("input", {
                type: "file",
                accept: "image/*",
                capture: "environment",
                onChange: (event) => handlePhotoUpload(event.target.files?.[0]),
              })
            ),
            activeShot.photoData
              ? h(
                  "div",
                  { className: "photo-preview" },
                  h("img", { src: activeShot.photoData, alt: "Coffee shot preview" }),
                  h("button", { onClick: () => updateShot("photoData", "") }, "Remove photo")
                )
              : h("p", null, "可以拍下 crema、奶泡或者今天的杯子。Photo stays in this draft until you tap Record.")
          ),
          h(
            "button",
            { className: "final-record-action", onClick: recordShot },
            editingShotId ? "更新记录" : "记录"
          ),
          h(
            "p",
            { className: "autosave" },
            recordMessage || "填写时只是草稿，点“记录”之后才会存进历史。"
          )
        ),
        h(
          "aside",
          { className: "metrics" },
          h("h2", null, "Quick read"),
          metrics.map(([label, value]) =>
            h("div", { className: "metric", key: label }, h("span", null, label), h("strong", null, value))
          ),
          h("div", { className: "machine-note" }, "54mm basket · bottomless portafilter · built-in grinder")
        )
      ),
    activeView === "history" &&
      h(
        "section",
        { className: "history" },
        h(
          "div",
          { className: "toolbar" },
          h("h2", null, "Shot history"),
          h(
            "div",
            { className: "toolbar-actions" },
            h(
              "button",
              {
                onClick: () =>
                  exportFile(
                    "coffee-os-logs.json",
                    JSON.stringify({ shots, tricks }, null, 2),
                    "application/json"
                  ),
              },
              "Export JSON"
            ),
            h(
              "button",
              { onClick: () => exportFile("coffee-os-logs.csv", toCsv(shots), "text/csv") },
              "Export CSV"
            ),
            h(
              "label",
              { className: "import-button" },
              "Import logs",
              h("input", {
                type: "file",
                accept: "application/json,.json",
                onChange: (event) => handleImport(event.target.files?.[0]),
              })
            )
          )
        ),
        importMessage ? h("p", { className: "import-message" }, importMessage) : null,
        h(
          "div",
          { className: "shot-list" },
          [...shots]
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
            .map((shot) =>
              h(
                "article",
                { className: "shot-card", key: shot.id },
                h(
                  "div",
                  null,
                  h("h3", null, `${shot.roaster || "Untitled roaster"} · ${shot.beanName || "Unnamed bean"}`),
                  h("p", null, new Date(shot.dateTime).toLocaleString()),
                  h(
                    "div",
                    { className: "pill-row" },
                    h("span", null, `${shot.dose || "?"}g in`),
                    h("span", null, `${shot.yield || "?"}g out`),
                    h("span", null, `${shot.shotTime || "?"} sec`),
                    h("span", null, formatRatio(shot))
                  )
                ),
                h("p", null, shot.tasteNotes || "No taste notes yet."),
                shot.photoData
                  ? h("img", {
                      className: "history-photo",
                      src: shot.photoData,
                      alt: `${shot.beanName || "Coffee"} photo`,
                    })
                  : null,
                h(
                  "div",
                  { className: "card-actions" },
                  h(
                    "button",
                    {
                      onClick: () => {
                        setDraftShot({ ...emptyShot(), ...shot });
                        setEditingShotId(shot.id);
                        setRecordMessage("正在编辑一条已有记录，点“更新记录”后才会保存更改。");
                        setActiveView("log");
                      },
                    },
                    "Edit"
                  ),
                  h("button", { onClick: () => removeShot(shot.id) }, "Delete")
                )
              )
            )
        )
      ),
    activeView === "tricks" &&
      h(
        "section",
        { className: "tricks" },
        h("div", { className: "section-heading" }, h("h2", null, "Coffee tricks")),
        h(
          "div",
          { className: "trick-editor" },
          h(TextInput, {
            label: "Title",
            value: trickDraft.title,
            placeholder: "Stop shot at blonding",
            onChange: (value) => setTrickDraft((draft) => ({ ...draft, title: value })),
          }),
          h(TextArea, {
            label: "How to try",
            value: trickDraft.how,
            onChange: (value) => setTrickDraft((draft) => ({ ...draft, how: value })),
          }),
          h(TextArea, {
            label: "When to use",
            value: trickDraft.when,
            onChange: (value) => setTrickDraft((draft) => ({ ...draft, when: value })),
          }),
          h(TextArea, {
            label: "Result notes",
            value: trickDraft.result,
            onChange: (value) => setTrickDraft((draft) => ({ ...draft, result: value })),
          }),
          h("button", { className: "primary-action", onClick: addTrick }, "Save trick")
        ),
        h(
          "div",
          { className: "trick-list" },
          tricks.map((trick) =>
            h(
              "article",
              { className: "trick-card", key: trick.id },
              h("h3", null, trick.title),
              h("p", null, h("strong", null, "How: "), trick.how),
              h("p", null, h("strong", null, "Use when: "), trick.when),
              h("p", null, h("strong", null, "Result: "), trick.result),
              h(
                "button",
                { onClick: () => setTricks((current) => current.filter((item) => item.id !== trick.id)) },
                "Remove"
              )
            )
          )
        )
      )
  );
}

createRoot(document.getElementById("root")).render(h(App));
