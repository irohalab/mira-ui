export function removeDarkTheme(): void {
    window.localStorage.removeItem('theme_for_deneb');
    document.body.classList.remove('dark-theme');
}
