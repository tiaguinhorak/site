/** Blocking theme script — runs in layout <head> before paint to avoid flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("theme")||"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t}catch(e){}})();`;
