import { render, screen, fireEvent, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { NavTabs } from '@/components/NavTabs'
import { useAppStore } from '@/store/useAppStore'
import type { TabId } from '@/store/types'

beforeEach(() => useAppStore.setState({ activeTab: 'today' }))

const PRIMARY: [string, TabId][] = [
  ['اليوم', 'today'], ['تدريب', 'practice'], ['كلماتي', 'words'], ['تعلّمي', 'learning'],
]

const MORE: [string, TabId][] = [
  ['الإعدادات والنسخ الاحتياطي', 'settings'],
  ['محاكاة الامتحان', 'exam'], ['تمارين', 'exercises'], ['مواقف يومية', 'situations'], ['قواعد', 'grammar'],
  ['لوحة التحكم', 'dashboard'], ['خطة الكتب', 'plan'], ['التحليلات', 'stats'],
  ['المفردات + AI', 'vocab'], ['الكتب', 'books'], ['مصادر DUO', 'resources'], ['منصّتي', 'platform'],
]

const topNav = () => screen.getByRole('navigation', { name: 'التنقل الرئيسي' })

describe('navigation after the observatory merge', () => {
  it('reaches every section through visible controls', async () => {
    render(<NavTabs />)
    for (const [label, tab] of PRIMARY) {
      fireEvent.click(within(topNav()).getByRole('button', { name: label }))
      expect(useAppStore.getState().activeTab).toBe(tab)
      expect(document.getElementById(`ntab-${tab}`)).toHaveAttribute('aria-current', 'page')
    }
    for (const [label, tab] of MORE) {
      fireEvent.click(within(topNav()).getByRole('button', { name: /المزيد/ }))
      const dialog = await screen.findByRole('dialog', { name: 'كل الأدوات' })
      fireEvent.click(within(dialog).getByRole('button', { name: label }))
      expect(useAppStore.getState().activeTab).toBe(tab)
    }
  })

  it('says which tool is open under «المزيد»', () => {
    useAppStore.setState({ activeTab: 'situations' })
    render(<NavTabs />)
    expect(within(topNav()).getByRole('button', { name: /المزيد · مواقف يومية/ })).toHaveAttribute('aria-current', 'page')
  })
})
