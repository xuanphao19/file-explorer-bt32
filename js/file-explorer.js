// js/file-explorer.js
import { service } from "./service";

// 📌 Lấy phần tử cha chính
const explorer = document.getElementById("list-item");
const errorBox = document.getElementById("error-message");
const menu = document.querySelector(".modal");
let projectName = "";
let treeData = [];
let isAddNode = false;

// 🧹 Dọn trạng thái hiện tại
function clearUIState(event = {}) {
  if (event.type !== "contextmenu") explorer.querySelector(".active")?.classList.remove("active");
  explorer?.querySelector("[tabindex]")?.removeAttribute("tabindex");
  if (menu) menu.style.top = `-5000px`;
  menu?.classList.remove("show");
}

function createItemElement(node) {
  const item = document.createElement("div");
  const extension = getTypeFile(node.name);
  item.className = `pl-4 ${node.type}${node.type === "folder" ? " parent" : ""} item`;
  if (node.project) item.dataset.project = `${node.project}`;
  item.innerHTML = `
<div class="item hover:bg-gray-700 p-1 pl-4 flex items-center">
  ${
    node.type === "folder"
      ? `
      <svg class="icon icon-chevron flex items-center">
        <use xlink:href="#chevron"></use>
      </svg>
      <span class="icon flex items-center ml-1">📁</span>`
      : `<svg class="icon icon-svg flex items-center">
          <use xlink:href="#icon-${extension !== null ? extension : "txt"}"></use>
        </svg>`
  }
      <span class="item-name ml-3">${node.name}</span>
</div>`;
  return item;
}

function getTypeFile(filename) {
  if (!filename.includes(".")) return null;
  let extend = filename.split(".").pop().toLowerCase();
  const imageExt = ["jpg", "png", "img"];
  const validExt = ["css", "js", "html", "json", "svg", "png"];

  if (imageExt.includes(extend)) return "png";
  return validExt.includes(extend) ? extend : "txt";
}

function renderNode(node, container) {
  const item = createItemElement(node);
  container.appendChild(item);

  // 🎯 Click chọn
  item.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    clearUIState(event);
    const target = event.target.closest(".item");
    target?.classList.add("active");
    target?.classList.toggle("rotate-icon");

    let parent = target?.parentElement;
    parent?.classList.toggle("show-children");
  });

  // 📋 Chuột phải hiện menu
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();

    clearUIState(event);

    const target = event.target.closest(".item");
    target?.setAttribute("tabindex", "-1");

    const x = event.pageX;
    const y = event.pageY;
    showContextMenu(node, target, x, y);
  });

  // ♻️ Con nếu không rỗng Thì Đệ Quy!
  if (node.type === "folder" && node.children?.length) {
    node.children.forEach((child) => renderNode(child, item));
  }
}

function showContextMenu(node, item, x, y) {
  if (!menu) return;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add("show");
  document.body.appendChild(menu);

  //  Sự kiện bên ngoài menu -> CloseModal
  function outsideClickHandler(e) {
    if (e.target.closest(".modal") !== menu) {
      handleCloseModal(item, menu);
    }

    document.removeEventListener("mousedown", outsideClickHandler);
  }

  // Gán sự kiện bên ngoài
  document.addEventListener("mousedown", outsideClickHandler);

  menu.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      const actions = event.target.closest("[data-act]")?.dataset.act;
      projectName = item?.closest("[data-project]")?.dataset.project;

      handleDirectoryTreeUpdates(actions, item, node);

      handleCloseModal(item, menu);
    },
    { once: true },
  );
}

async function fetchTree() {
  try {
    const data = await service.getAll();
    treeData = data;
    explorer.innerHTML = "";
    data.forEach((node) => renderNode(node, explorer));
    errorBox.textContent = "";
  } catch (err) {
    console.error("err:", err);
    errorBox.textContent = "Lỗi: " + err.message;
  }
}

async function handleCloseModal(item, menu) {
  item?.removeAttribute("tabindex");
  menu.classList.remove("show");
  menu.style.top = `-5000px`;
}

async function handleDirectoryTreeUpdates(act, item, node) {
  switch (act) {
    case "new-file":
      handleCreateNode(item, node, "file");
      return;

    case "new-folder":
      handleCreateNode(item, node, "folder");
      return;

    case "rename":
      handleRename(item, node);
      return;

    case "add-folder":
      addFolder();
      return;

    case "delete":
      deleteNode(item, node);
      return;

    case "open-with":
    case "file-explorer":
    case "share":
    case "add-folder":
    case "open-folder":
    case "remove-folder":
    case "find-in-folder":
    case "paste":
    case "copy-path":
    case "file-history":
      console.log("Đang cập nhật Logic! I -❤- F8!");
      return;

    default:
      return;
  }
}

function transformTreeNode(tree, targetId, transformFn) {
  if (tree.id === targetId) {
    return transformFn(tree);
  }

  if (tree.children) {
    const children = tree.children
      .map((child) => transformTreeNode(child, targetId, transformFn))
      .filter(Boolean);

    return { ...tree, children: children };
  }

  return tree;
}

async function handleCreateNode(item, node, type) {
  const container = document.querySelector(`[data-project="${projectName}"]`);
  if (!container) return;

  isAddNode = true;
  const newNode = {
    id: Date.now().toString(),
    name: "",
    type: type,
    children: type === "folder" ? [] : undefined,
  };

  node.children = node.children || [];
  node.children.push(newNode);

  const parentElement = item.closest(".parent");
  parentElement.classList.add("show-children");

  const lastItem = parentElement.lastElementChild;
  renderNode(newNode, parentElement);
  const newItem = lastItem.nextElementSibling;

  handleRename(newItem, newNode, parentElement);
}

async function handleRename(item, node, parent) {
  const itemNameEl = item.querySelector(".item-name");
  if (!itemNameEl) return;

  const oldName = itemNameEl.textContent.trim();
  itemNameEl.setAttribute("contentEditable", "true");
  itemNameEl.focus();

  // Chọn text
  const range = document.createRange();
  range.selectNodeContents(itemNameEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // Cancel khi mất focus
  const cancelRename = () => {
    itemNameEl.textContent = oldName;
    itemNameEl.removeAttribute("contentEditable");
    if (isAddNode) {
      item.remove();
      isAddNode = false;
      renderNode(node, parent);
    }
  };

  const confirmRename = async () => {
    const newName = itemNameEl.textContent.trim();
    if (!newName || newName === oldName) return cancelRename();

    node.name = newName;
    itemNameEl.removeAttribute("contentEditable");
    itemNameEl.textContent = newName;

    const upDateName = (node) => ({
      ...node,
      name: newName,
    });
    updateData(node, upDateName);
  };

  itemNameEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRename();
      if (isAddNode) {
        isAddNode = false;
        item.remove();
      }
      renderNode(node, parent);
    } else if (e.key === "Escape") {
      cancelRename();
    }
  });

  itemNameEl.addEventListener("blur", cancelRename, { once: true });
}

async function updateData(node, callback) {
  try {
    const data = treeData.find((item) => item.project === projectName);
    const treeUpdate = transformTreeNode(data, node.id, callback);
    await service.update(data.id, treeUpdate);
  } catch (err) {
    errorBox.textContent = "Lỗi khi cập nhật: " + err.message;
  }
}

async function addFolder() {
  console.log("Chờ cập nhật Logic! I -💕- F8!");
}

async function deleteNode(item, node) {
  const parent = item.closest(".parent");

  const handleDelete = () => null;
  await updateData(node, handleDelete);

  if (item.closest(".file")) {
    return item.remove();
  }

  if (parent && parent === item?.closest("[data-project]")) return;

  parent?.remove();
}

fetchTree();
