import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')

export function useTheme() {
    const initTheme = () => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('napoleon-theme') as Theme | null
        if (savedTheme) {
            theme.value = savedTheme
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme.value = 'dark'
            } else {
                theme.value = 'light'
            }
        }
        applyTheme()
    }

    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
        applyTheme()
    }

    const applyTheme = () => {
        document.documentElement.setAttribute('data-theme', theme.value)
        localStorage.setItem('napoleon-theme', theme.value)
    }

    return {
        theme,
        toggleTheme,
        initTheme
    }
}
