import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Profile = {
  id: string
  username: string
  display_name: string
}

type ChatSummary = {
  id: string
  title: string
  subtitle: string
  time: string
  updatedAt: string
  isGroup: boolean
}

type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: {
    display_name?: string
    username?: string
  } | null
}

type TabName = 'home' | 'find' | 'profile'

const demoChats: ChatSummary[] = [
  {
    id: 'demo-design',
    title: 'Cantinho criativo',
    subtitle: 'Maya: alguém viu as referências?',
    time: '10:42',
    updatedAt: '2026-10-22T10:42:00.000Z',
    isGroup: true,
  },
  {
    id: 'demo-leo',
    title: 'Leo Martins',
    subtitle: 'Te mando o link daqui a pouco',
    time: '09:18',
    updatedAt: '2026-10-22T09:18:00.000Z',
    isGroup: false,
  },
  {
    id: 'demo-games',
    title: 'Clube dos jogos',
    subtitle: 'Nina: bora jogar mais tarde?',
    time: 'Ontem',
    updatedAt: '2026-10-21T19:00:00.000Z',
    isGroup: true,
  },
]

const demoPeople: Profile[] = [
  { id: 'demo-maya', username: 'maya.cria', display_name: 'Maya Costa' },
  { id: 'demo-leo-user', username: 'leo.martins', display_name: 'Leo Martins' },
  { id: 'demo-nina', username: 'nina.dev', display_name: 'Nina Alves' },
  { id: 'demo-theo', username: 'theo.games', display_name: 'Theo Lima' },
]

const demoMessages: Record<string, ChatMessage[]> = {
  'demo-design': [
    {
      id: 'design-1',
      conversation_id: 'demo-design',
      sender_id: 'demo-maya',
      content: 'Gente, criei um cantinho para reunir as ideias ✨',
      created_at: '2026-10-22T10:35:00.000Z',
      sender: { display_name: 'Maya Costa', username: 'maya.cria' },
    },
    {
      id: 'design-2',
      conversation_id: 'demo-design',
      sender_id: 'demo-me',
      content: 'Boa! Vou separar algumas referências.',
      created_at: '2026-10-22T10:38:00.000Z',
      sender: { display_name: 'Alex', username: 'alex' },
    },
    {
      id: 'design-3',
      conversation_id: 'demo-design',
      sender_id: 'demo-maya',
      content: 'alguém viu as referências?',
      created_at: '2026-10-22T10:42:00.000Z',
      sender: { display_name: 'Maya Costa', username: 'maya.cria' },
    },
  ],
  'demo-leo': [
    {
      id: 'leo-1',
      conversation_id: 'demo-leo',
      sender_id: 'demo-leo-user',
      content: 'Estou ajustando aquela tela. Ficou bem legal!',
      created_at: '2026-10-22T09:12:00.000Z',
      sender: { display_name: 'Leo Martins', username: 'leo.martins' },
    },
    {
      id: 'leo-2',
      conversation_id: 'demo-leo',
      sender_id: 'demo-me',
      content: 'Te mando o link daqui a pouco',
      created_at: '2026-10-22T09:18:00.000Z',
      sender: { display_name: 'Alex', username: 'alex' },
    },
  ],
  'demo-games': [
    {
      id: 'games-1',
      conversation_id: 'demo-games',
      sender_id: 'demo-nina',
      content: 'bora jogar mais tarde?',
      created_at: '2026-10-21T19:00:00.000Z',
      sender: { display_name: 'Nina Alves', username: 'nina.dev' },
    },
  ],
}

const palette = {
  bg: '#10111B',
  surface: '#191B2A',
  surfaceAlt: '#222438',
  border: '#2D3046',
  text: '#F5F4FF',
  muted: '#A4A5BC',
  accent: '#9A86FF',
  accentSoft: '#302B50',
  green: '#72DDB1',
  bubble: '#282A40',
}

function shortTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Ontem'
}

function Avatar({ label, color, size = 48 }: { label: string; color?: string; size?: number }) {
  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size * 0.34, backgroundColor: color ?? palette.accentSoft },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.31 }]}>{initials || 'C'}</Text>
    </View>
  )
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  secondary,
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  secondary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </Pressable>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(isSupabaseConfigured)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [activeTab, setActiveTab] = useState<TabName>('home')
  const [chats, setChats] = useState<ChatSummary[]>(isSupabaseConfigured ? [] : demoChats)
  const [chatsBusy, setChatsBusy] = useState(false)
  const [currentChat, setCurrentChat] = useState<ChatSummary | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [people, setPeople] = useState<Profile[]>(isSupabaseConfigured ? [] : demoPeople)
  const [peopleBusy, setPeopleBusy] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const messagesListRef = useRef<FlatList<ChatMessage>>(null)

  const isDemo = !isSupabaseConfigured
  const currentUserId = session?.user.id ?? 'demo-me'
  const currentUserName =
    String(session?.user.user_metadata?.display_name ?? '') ||
    String(session?.user.user_metadata?.username ?? '') ||
    (session?.user.email ? session.user.email.split('@')[0] : 'Alex')

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false)
      return
    }

    let mounted = true
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) console.warn('Não foi possível restaurar a sessão:', error.message)
        setSession(data.session)
        setIsCheckingSession(false)
      })
      .catch(() => {
        if (mounted) setIsCheckingSession(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsCheckingSession(false)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isDemo) {
      setChats(demoChats)
      return
    }
    if (!session || !supabase) {
      setChats([])
      return
    }

    let cancelled = false
    async function loadChats() {
      setChatsBusy(true)
      const { data, error } = await supabase!
        .from('conversation_members')
        .select('conversation_id, display_title, conversations(id, title, is_group)')
        .eq('user_id', session!.user.id)

      if (error) {
        console.warn('Erro ao carregar conversas:', error.message)
        if (!cancelled) Alert.alert('Não foi possível carregar as conversas', error.message)
        if (!cancelled) setChatsBusy(false)
        return
      }

      const rows = (data ?? []) as any[]
      const mapped = await Promise.all(
        rows.map(async (row) => {
          const conversation = Array.isArray(row.conversations) ? row.conversations[0] : row.conversations
          if (!conversation) return null
          const { data: lastMessage } = await supabase!
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', row.conversation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          return {
            id: row.conversation_id as string,
            title: (row.display_title || conversation.title || 'Conversa') as string,
            subtitle: (lastMessage?.content || 'Comece uma conversa') as string,
            time: shortTime(lastMessage?.created_at),
            updatedAt: (lastMessage?.created_at || conversation.created_at || '') as string,
            isGroup: Boolean(conversation.is_group),
          } satisfies ChatSummary
        }),
      )

      if (!cancelled) {
        setChats(mapped.filter(Boolean).sort((a, b) => (b!.updatedAt || '').localeCompare(a!.updatedAt || '')) as ChatSummary[])
        setChatsBusy(false)
      }
    }

    void loadChats()
    return () => {
      cancelled = true
    }
  }, [session?.user.id, isDemo])

  useEffect(() => {
    if (!currentChat) {
      setMessages([])
      return
    }

    let cancelled = false
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

    async function loadMessages() {
      if (currentChat!.id.startsWith('demo-')) {
        setMessages(demoMessages[currentChat!.id] ?? [])
        return
      }
      if (!supabase || !session) {
        setMessages([])
        return
      }

      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, profiles(display_name, username)')
        .eq('conversation_id', currentChat!.id)
        .order('created_at', { ascending: true })
        .limit(150)

      if (error) {
        if (!cancelled) Alert.alert('Erro ao abrir mensagens', error.message)
        return
      }

      const rows = (data ?? []) as any[]
      const mapped: ChatMessage[] = rows.map((row) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        sender_id: row.sender_id,
        content: row.content,
        created_at: row.created_at,
        sender: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
      }))
      if (!cancelled) setMessages(mapped)
    }

    void loadMessages()

    if (supabase && session && !currentChat.id.startsWith('demo-')) {
      channel = supabase
        .channel('chat-messages-' + currentChat.id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: 'conversation_id=eq.' + currentChat.id,
          },
          async (payload) => {
            const newMessageId = String((payload.new as any).id)
            const { data, error } = await supabase!
              .from('messages')
              .select('id, conversation_id, sender_id, content, created_at, profiles(display_name, username)')
              .eq('id', newMessageId)
              .single()
            if (error || !data || cancelled) return
            const row = data as any
            const next: ChatMessage = {
              id: row.id,
              conversation_id: row.conversation_id,
              sender_id: row.sender_id,
              content: row.content,
              created_at: row.created_at,
              sender: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
            }
            setMessages((previous) =>
              previous.some((item) => item.id === next.id)
                ? previous
                : [...previous, next],
            )
          },
        )
        .subscribe()
    }

    return () => {
      cancelled = true
      if (channel && supabase) void supabase.removeChannel(channel)
    }
  }, [currentChat?.id, session?.user.id])

  const filteredChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase()
    if (!query) return chats
    return chats.filter(
      (chat) => chat.title.toLowerCase().includes(query) || chat.subtitle.toLowerCase().includes(query),
    )
  }, [chats, chatSearch])

  async function handleAuth() {
    if (!supabase) return
    const email = emailInput.trim().toLowerCase()
    const password = passwordInput

    if (!email || !email.includes('@')) {
      Alert.alert('Confira o e-mail', 'Digite um endereço de e-mail válido.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Senha muito curta', 'Use pelo menos 6 caracteres.')
      return
    }
    if (authMode === 'signup') {
      const username = usernameInput.trim().replace(/^@/, '').toLowerCase()
      if (username.length < 3 || !/^[a-z0-9_.]{3,24}$/.test(username)) {
        Alert.alert('Nome de usuário inválido', 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto ou _.')
        return
      }
    }

    setAuthBusy(true)
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const username = usernameInput.trim().replace(/^@/, '').toLowerCase()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayNameInput.trim() || username,
            },
          },
        })
        if (error) throw error
        if (!data.session) {
          Alert.alert('Confira seu e-mail', 'A conta foi criada. Confirme seu e-mail para entrar no Chat.')
        }
      }
    } catch (error) {
      Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase || isDemo) {
      setActiveTab('home')
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) Alert.alert('Erro ao sair', error.message)
    setCurrentChat(null)
    setActiveTab('home')
  }

  async function searchPeople() {
    const query = searchText.trim().replace(/^@/, '')
    if (!query) {
      setPeople(isDemo ? demoPeople : [])
      return
    }

    if (isDemo) {
      setPeople(demoPeople.filter((person) =>
        (person.username + ' ' + person.display_name).toLowerCase().includes(query.toLowerCase()),
      ))
      return
    }

    if (!supabase || !session) return
    setPeopleBusy(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('username', '%' + query + '%')
      .neq('id', session.user.id)
      .limit(20)

    if (error) Alert.alert('Erro na busca', error.message)
    setPeople((data ?? []) as Profile[])
    setPeopleBusy(false)
  }

  async function startConversation(person: Profile) {
    if (isDemo || person.id.startsWith('demo-')) {
      const nextChat: ChatSummary = {
        id: 'demo-new-' + Date.now(),
        title: person.display_name,
        subtitle: 'Comece a conversa',
        time: 'Agora',
        updatedAt: new Date().toISOString(),
        isGroup: false,
      }
      setChats((previous) => [nextChat, ...previous])
      setCurrentChat(nextChat)
      setActiveTab('home')
      return
    }

    if (!supabase || !session) return
    try {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ title: 'Conversa direta', is_group: false, created_by: session.user.id })
        .select('id, title, is_group')
        .single()
      if (conversationError) throw conversationError

      const { error: membershipError } = await supabase.from('conversation_members').insert([
        {
          conversation_id: conversation.id,
          user_id: session.user.id,
          display_title: person.display_name,
        },
        {
          conversation_id: conversation.id,
          user_id: person.id,
          display_title: currentUserName,
        },
      ])
      if (membershipError) throw membershipError

      const nextChat: ChatSummary = {
        id: conversation.id,
        title: person.display_name,
        subtitle: 'Comece a conversa',
        time: 'Agora',
        updatedAt: new Date().toISOString(),
        isGroup: false,
      }
      setChats((previous) => [nextChat, ...previous])
      setCurrentChat(nextChat)
      setActiveTab('home')
    } catch (error) {
      Alert.alert('Não foi possível criar a conversa', error instanceof Error ? error.message : 'Tente novamente.')
    }
  }

  async function sendMessage() {
    const content = messageDraft.trim()
    if (!content || !currentChat || sending) return
    setSending(true)

    if (isDemo || currentChat.id.startsWith('demo-')) {
      const next: ChatMessage = {
        id: 'local-' + Date.now(),
        conversation_id: currentChat.id,
        sender_id: 'demo-me',
        content,
        created_at: new Date().toISOString(),
        sender: { display_name: 'Alex', username: 'alex' },
      }
      setMessages((previous) => [...previous, next])
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === currentChat.id
            ? { ...chat, subtitle: content, time: 'Agora', updatedAt: next.created_at }
            : chat,
        ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      )
      setMessageDraft('')
      setSending(false)
      return
    }

    if (!supabase || !session) {
      setSending(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentChat.id,
          sender_id: session.user.id,
          content,
        })
        .select('id, conversation_id, sender_id, content, created_at')
        .single()
      if (error) throw error

      const next: ChatMessage = {
        ...data,
        sender: { display_name: currentUserName, username: String(session.user.user_metadata?.username ?? '') },
      }
      setMessages((previous) => previous.some((item) => item.id === next.id) ? previous : [...previous, next])
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === currentChat.id
            ? { ...chat, subtitle: content, time: 'Agora', updatedAt: next.created_at }
            : chat,
        ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      )
      setMessageDraft('')
    } catch (error) {
      Alert.alert('Mensagem não enviada', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (isCheckingSession) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="light" />
        <View style={styles.brandMarkLarge}><Text style={styles.brandGlyph}>c</Text></View>
        <Text style={styles.brandTitle}>Chat</Text>
        <ActivityIndicator color={palette.accent} style={{ marginTop: 24 }} />
      </SafeAreaView>
    )
  }

  if (isSupabaseConfigured && !session) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.authBrand}>
              <View style={styles.brandMarkLarge}><Text style={styles.brandGlyph}>c</Text></View>
              <Text style={styles.brandTitle}>Chat</Text>
              <Text style={styles.brandSubtitle}>Seu espaço para boas conversas.</Text>
            </View>

            <View style={styles.authCard}>
              <Text style={styles.cardHeading}>{authMode === 'signup' ? 'Crie sua conta' : 'Que bom ter você de volta'}</Text>
              <Text style={styles.cardDescription}>
                {authMode === 'signup' ? 'Comece a conversar com sua galera.' : 'Entre para continuar de onde parou.'}
              </Text>

              {authMode === 'signup' && (
                <>
                  <Text style={styles.inputLabel}>Como podemos te chamar?</Text>
                  <TextInput
                    value={displayNameInput}
                    onChangeText={setDisplayNameInput}
                    placeholder="Seu nome"
                    placeholderTextColor={palette.muted}
                    style={styles.textInput}
                    autoCapitalize="words"
                    maxLength={40}
                  />
                  <Text style={styles.inputLabel}>Nome de usuário</Text>
                  <TextInput
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    placeholder="ex.: alex.dev"
                    placeholderTextColor={palette.muted}
                    style={styles.textInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={24}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="voce@exemplo.com"
                placeholderTextColor={palette.muted}
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputLabel}>Senha</Text>
              <TextInput
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholder="Pelo menos 6 caracteres"
                placeholderTextColor={palette.muted}
                style={styles.textInput}
                secureTextEntry
                autoCapitalize="none"
              />

              <PrimaryButton
                title={authBusy ? 'Só um instante...' : authMode === 'signup' ? 'Criar conta' : 'Entrar'}
                onPress={() => void handleAuth()}
                disabled={authBusy}
              />
              {authBusy && <ActivityIndicator color={palette.accent} style={{ marginTop: 12 }} />}
              <Pressable
                onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
                style={styles.authSwitch}
              >
                <Text style={styles.authSwitchText}>
                  {authMode === 'signup' ? 'Já tem conta? ' : 'Ainda não tem conta? '}
                  <Text style={styles.authSwitchStrong}>{authMode === 'signup' ? 'Entrar' : 'Criar conta'}</Text>
                </Text>
              </Pressable>
            </View>
            <Text style={styles.footnote}>Um lugar leve para manter as conversas por perto.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  if (currentChat) {
    const otherName = currentChat.title
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatHeader}>
            <Pressable onPress={() => setCurrentChat(null)} style={styles.backButton} accessibilityLabel="Voltar às conversas">
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
            <Avatar label={otherName} size={42} color={palette.accentSoft} />
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>{otherName}</Text>
              <View style={styles.onlineLine}>
                <View style={[styles.onlineDot, { backgroundColor: isDemo ? palette.green : palette.accent }]} />
                <Text style={styles.onlineText}>{isDemo ? 'Modo de demonstração' : 'Conversa privada'}</Text>
              </View>
            </View>
            <Pressable onPress={() => Alert.alert('Detalhes', 'Mais opções de conversa chegam em uma próxima etapa.')} style={styles.iconButton}>
              <Text style={styles.moreGlyph}>···</Text>
            </Pressable>
          </View>

          {isDemo && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>Demonstração: mensagens ficam apenas neste dispositivo.</Text>
            </View>
          )}

          <FlatList
            ref={messagesListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <View style={styles.emptyMessageIcon}><Text style={{ fontSize: 24 }}>✦</Text></View>
                <Text style={styles.emptyTitle}>A conversa começa aqui</Text>
                <Text style={styles.emptyDescription}>Mande uma mensagem para quebrar o gelo.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === currentUserId || item.sender_id === 'demo-me'
              return (
                <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
                  {!mine && <Avatar label={item.sender?.display_name || otherName} size={29} />}
                  <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleTheirs]}>
                    {!mine && currentChat.isGroup && (
                      <Text style={styles.messageSender}>{item.sender?.display_name || item.sender?.username || otherName}</Text>
                    )}
                    <Text style={styles.messageText}>{item.content}</Text>
                    <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{shortTime(item.created_at)}</Text>
                  </View>
                </View>
              )
            }}
          />

          <View style={styles.composerArea}>
            <View style={styles.composer}>
              <TextInput
                value={messageDraft}
                onChangeText={setMessageDraft}
                placeholder="Escreva uma mensagem..."
                placeholderTextColor={palette.muted}
                style={styles.composerInput}
                multiline
                maxLength={4000}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => void sendMessage()}
              />
              <Pressable
                onPress={() => void sendMessage()}
                disabled={!messageDraft.trim() || sending}
                style={[styles.sendButton, (!messageDraft.trim() || sending) && styles.sendButtonDisabled]}
                accessibilityLabel="Enviar mensagem"
              >
                <Text style={styles.sendGlyph}>{sending ? '…' : '➤'}</Text>
              </Pressable>
            </View>
            <Text style={styles.composerHint}>{isDemo ? 'Prévia local • conecte o Supabase para conversar online' : 'Conversa sincronizada pelo Supabase Realtime'}</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  if (activeTab === 'find') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.pageScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.pageHeader}>
            <Text style={styles.eyebrow}>CONECTE-SE</Text>
            <Text style={styles.pageTitle}>Encontre sua galera</Text>
            <Text style={styles.pageSubtitle}>Busque pelo nome de usuário e comece uma conversa.</Text>
          </View>
          {isDemo && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerIcon}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoBannerTitle}>Você está na prévia</Text>
                <Text style={styles.demoBannerText}>A busca online será ativada quando o Supabase estiver configurado.</Text>
              </View>
            </View>
          )}
          <View style={styles.searchRow}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Buscar por @usuário"
              placeholderTextColor={palette.muted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void searchPeople()}
              returnKeyType="search"
            />
            <Pressable onPress={() => void searchPeople()} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>{peopleBusy ? '…' : 'Buscar'}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>PESSOAS PARA CONHECER</Text>
          {people.map((person) => (
            <View style={styles.personRow} key={person.id}>
              <Avatar label={person.display_name} size={47} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.personName}>{person.display_name}</Text>
                <Text style={styles.personHandle}>@{person.username}</Text>
              </View>
              <Pressable onPress={() => void startConversation(person)} style={styles.personAction}>
                <Text style={styles.personActionText}>Conversar</Text>
              </Pressable>
            </View>
          ))}
          {!peopleBusy && people.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Ninguém por aqui ainda</Text>
              <Text style={styles.emptyDescription}>Tente outra busca por nome de usuário.</Text>
            </View>
          )}
        </ScrollView>
        {renderTabBar(activeTab, setActiveTab)}
      </SafeAreaView>
    )
  }

  if (activeTab === 'profile') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.pageScroll}>
          <View style={styles.pageHeader}>
            <Text style={styles.eyebrow}>SUA CONTA</Text>
            <Text style={styles.pageTitle}>Seu perfil</Text>
            <Text style={styles.pageSubtitle}>Um pouquinho sobre você.</Text>
          </View>
          <View style={styles.profileCard}>
            <Avatar label={currentUserName} size={76} color={palette.accentSoft} />
            <Text style={styles.profileName}>{currentUserName}</Text>
            <Text style={styles.profileHandle}>
              {session?.user.user_metadata?.username ? '@' + session.user.user_metadata.username : '@alex'}
            </Text>
            <View style={styles.profileDivider} />
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileInfoLabel}>Conexão</Text>
              <Text style={styles.profileInfoValue}>{isDemo ? 'Demonstração local' : 'Supabase conectado'}</Text>
            </View>
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileInfoLabel}>Conversas</Text>
              <Text style={styles.profileInfoValue}>{chats.length}</Text>
            </View>
          </View>
          <View style={styles.settingsCard}>
            <View style={styles.settingsIcon}><Text style={{ fontSize: 18 }}>◈</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Privacidade primeiro</Text>
              <Text style={styles.settingsDescription}>As mensagens online usam regras de acesso no banco para que só participantes leiam cada conversa.</Text>
            </View>
          </View>
          {!isDemo && (
            <PrimaryButton title="Sair da conta" onPress={() => void handleSignOut()} secondary />
          )}
          {isDemo && (
            <Text style={styles.footnote}>O modo demonstração não cria conta nem envia mensagens para a internet.</Text>
          )}
        </ScrollView>
        {renderTabBar(activeTab, setActiveTab)}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.homeScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.homeTop}>
          <View style={styles.miniBrand}>
            <View style={styles.brandMarkSmall}><Text style={styles.brandGlyphSmall}>c</Text></View>
            <Text style={styles.miniBrandText}>Chat</Text>
          </View>
          <Pressable onPress={() => setActiveTab('profile')} style={styles.profileShortcut}>
            <Avatar label={currentUserName} size={38} />
            <View style={styles.profileShortcutDot} />
          </Pressable>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.eyebrow}>SEU ESPAÇO, SUAS PESSOAS</Text>
          <Text style={styles.greeting}>Oi, {currentUserName.split(' ')[0]} <Text style={{ color: palette.accent }}>✦</Text></Text>
          <Text style={styles.greetingSubtitle}>Qual conversa vamos continuar?</Text>
        </View>

        {isDemo && (
          <View style={styles.demoBanner}>
            <View style={styles.demoBannerIconWrap}><Text style={styles.demoBannerIcon}>✦</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.demoBannerTitle}>Modo de demonstração</Text>
              <Text style={styles.demoBannerText}>Explore a tela agora. Conecte o Supabase para conversar com amigos de verdade.</Text>
            </View>
          </View>
        )}

        <View style={styles.searchBar}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            value={chatSearch}
            onChangeText={setChatSearch}
            placeholder="Buscar conversas..."
            placeholderTextColor={palette.muted}
            style={styles.searchBarInput}
            autoCapitalize="none"
          />
          {chatSearch.length > 0 && (
            <Pressable onPress={() => setChatSearch('')}><Text style={styles.clearSearch}>×</Text></Pressable>
          )}
        </View>

        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>SUAS CONVERSAS</Text>
          <Text style={styles.chatCount}>{chats.length} {chats.length === 1 ? 'chat' : 'chats'}</Text>
        </View>

        {chatsBusy && <ActivityIndicator color={palette.accent} style={{ marginVertical: 24 }} />}
        {filteredChats.map((chat, index) => (
          <Pressable
            key={chat.id}
            onPress={() => setCurrentChat(chat)}
            style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
          >
            <View style={styles.chatAvatarWrap}>
              <Avatar label={chat.title} size={54} color={index % 2 === 0 ? '#383052' : '#263B49'} />
              {chat.isGroup && <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>✦</Text></View>}
            </View>
            <View style={styles.chatRowMain}>
              <View style={styles.chatRowTitleLine}>
                <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              <Text style={styles.chatSubtitle} numberOfLines={1}>{chat.subtitle}</Text>
            </View>
            <Text style={styles.chatChevron}>›</Text>
          </Pressable>
        ))}

        {!chatsBusy && filteredChats.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMessageIcon}><Text style={{ fontSize: 24 }}>✦</Text></View>
            <Text style={styles.emptyTitle}>{chatSearch ? 'Nenhum resultado' : 'Ainda sem conversas'}</Text>
            <Text style={styles.emptyDescription}>
              {chatSearch ? 'Tente buscar por outro nome.' : 'Vá até Encontrar para iniciar um papo.'}
            </Text>
            {!chatSearch && <PrimaryButton title="Encontrar pessoas" onPress={() => setActiveTab('find')} />}
          </View>
        )}

        <View style={styles.bottomHint}>
          <View style={styles.bottomHintDot} />
          <Text style={styles.bottomHintText}>{isDemo ? 'Uma prévia do que vem por aí' : 'Suas conversas estão prontas para sincronizar'}</Text>
        </View>
      </ScrollView>
      {renderTabBar(activeTab, setActiveTab)}
    </SafeAreaView>
  )
}

function renderTabBar(activeTab: TabName, setActiveTab: (tab: TabName) => void) {
  const tabs: { id: TabName; icon: string; label: string }[] = [
    { id: 'home', icon: '▤', label: 'Conversas' },
    { id: 'find', icon: '⌕', label: 'Encontrar' },
    { id: 'profile', icon: '◉', label: 'Perfil' },
  ]

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.id
        return (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View style={[styles.tabIconWrap, selected && styles.tabIconWrapSelected]}>
              <Text style={[styles.tabIcon, selected && styles.tabIconSelected]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  loadingScreen: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  authScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 26 },
  authBrand: { alignItems: 'center', marginBottom: 28 },
  brandMarkLarge: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, transform: [{ rotate: '-5deg' }] },
  brandGlyph: { color: '#171326', fontSize: 48, fontWeight: '900', lineHeight: 54 },
  brandTitle: { color: palette.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 12 },
  brandSubtitle: { color: palette.muted, fontSize: 14, marginTop: 6 },
  authCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 25, padding: 21 },
  cardHeading: { color: palette.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  cardDescription: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 20 },
  inputLabel: { color: '#D7D5EC', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 13 },
  textInput: { backgroundColor: '#111321', borderWidth: 1, borderColor: palette.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: palette.text },
  primaryButton: { backgroundColor: palette.accent, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, marginTop: 19 },
  primaryButtonText: { color: '#171326', fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.border },
  secondaryButtonText: { color: palette.text },
  disabledButton: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  authSwitch: { alignItems: 'center', marginTop: 20 },
  authSwitchText: { color: palette.muted, fontSize: 13 },
  authSwitchStrong: { color: '#C0B4FF', fontWeight: '800' },
  footnote: { color: '#777A95', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 22, paddingHorizontal: 18 },
  homeScroll: { paddingHorizontal: 21, paddingBottom: 28 },
  homeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMarkSmall: { width: 33, height: 33, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  brandGlyphSmall: { color: '#171326', fontSize: 26, fontWeight: '900', lineHeight: 29 },
  miniBrandText: { color: palette.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
  profileShortcut: { position: 'relative' },
  profileShortcutDot: { width: 10, height: 10, backgroundColor: palette.green, borderRadius: 5, borderWidth: 2, borderColor: palette.bg, position: 'absolute', bottom: -1, right: -1 },
  greetingBlock: { marginTop: 28, marginBottom: 20 },
  eyebrow: { color: palette.accent, fontSize: 10, letterSpacing: 1.6, fontWeight: '800' },
  greeting: { color: palette.text, fontSize: 31, fontWeight: '800', letterSpacing: -1.1, marginTop: 9 },
  greetingSubtitle: { color: palette.muted, fontSize: 14, marginTop: 5 },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#211F37', borderColor: '#40365E', borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 17 },
  demoBannerIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#383052', alignItems: 'center', justifyContent: 'center' },
  demoBannerIcon: { color: '#CABFFF', fontSize: 18 },
  demoBannerTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  demoBannerText: { color: '#B5B2CF', fontSize: 11, lineHeight: 16, marginTop: 3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 13, minHeight: 49 },
  searchGlyph: { fontSize: 27, color: palette.muted, marginRight: 8, marginTop: -5 },
  searchBarInput: { flex: 1, color: palette.text, fontSize: 13, paddingVertical: 10 },
  clearSearch: { color: palette.muted, fontSize: 23, paddingHorizontal: 4 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 9 },
  sectionTitle: { color: '#8588A5', fontSize: 10, letterSpacing: 1.3, fontWeight: '800' },
  chatCount: { color: palette.muted, fontSize: 11 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#24263A' },
  chatRowPressed: { opacity: 0.65 },
  chatAvatarWrap: { position: 'relative' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#E6E0FF', fontWeight: '800' },
  groupBadge: { width: 21, height: 21, borderRadius: 8, backgroundColor: '#242039', borderWidth: 2, borderColor: palette.bg, position: 'absolute', right: -5, bottom: -4, alignItems: 'center', justifyContent: 'center' },
  groupBadgeText: { color: palette.accent, fontSize: 10 },
  chatRowMain: { flex: 1, marginLeft: 13 },
  chatRowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { color: palette.text, fontSize: 14, fontWeight: '700', maxWidth: '76%' },
  chatTime: { color: '#8588A5', fontSize: 10, marginLeft: 6 },
  chatSubtitle: { color: palette.muted, fontSize: 12, marginTop: 5 },
  chatChevron: { color: '#656984', fontSize: 24, paddingLeft: 8 },
  bottomHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 26, gap: 8 },
  bottomHintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  bottomHintText: { color: '#7D809B', fontSize: 11 },
  tabBar: { flexDirection: 'row', backgroundColor: '#171927', borderTopColor: '#292B40', borderTopWidth: 1, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 19 : 10, paddingHorizontal: 18 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabIconWrap: { minWidth: 50, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapSelected: { backgroundColor: '#302B50' },
  tabIcon: { color: '#888BA6', fontSize: 19, fontWeight: '700' },
  tabIconSelected: { color: '#C7BCFF' },
  tabLabel: { color: '#888BA6', fontSize: 10, fontWeight: '600' },
  tabLabelSelected: { color: '#C7BCFF', fontWeight: '800' },
  pageScroll: { paddingHorizontal: 21, paddingTop: 25, paddingBottom: 30, flexGrow: 1 },
  pageHeader: { marginBottom: 23 },
  pageTitle: { color: palette.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  pageSubtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  searchRow: { flexDirection: 'row', gap: 9, marginBottom: 28 },
  searchInput: { flex: 1, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: palette.text, fontSize: 13 },
  searchButton: { backgroundColor: palette.accent, borderRadius: 13, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: '#171326', fontWeight: '800', fontSize: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomColor: '#25273B', borderBottomWidth: 1 },
  personName: { color: palette.text, fontWeight: '700', fontSize: 14 },
  personHandle: { color: palette.muted, fontSize: 12, marginTop: 4 },
  personAction: { backgroundColor: '#302B50', borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12 },
  personActionText: { color: '#C8BEFF', fontSize: 11, fontWeight: '800' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 25, marginTop: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20 },
  emptyMessageIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#302B50', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: palette.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: palette.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 3 },
  profileCard: { alignItems: 'center', padding: 24, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 23 },
  profileName: { color: palette.text, fontSize: 21, fontWeight: '800', marginTop: 13 },
  profileHandle: { color: palette.muted, fontSize: 13, marginTop: 4 },
  profileDivider: { height: 1, backgroundColor: palette.border, alignSelf: 'stretch', marginVertical: 21 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginVertical: 5 },
  profileInfoLabel: { color: palette.muted, fontSize: 12 },
  profileInfoValue: { color: palette.text, fontSize: 12, fontWeight: '700' },
  settingsCard: { flexDirection: 'row', gap: 12, padding: 15, marginTop: 15, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 18 },
  settingsIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#302B50', alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { color: palette.text, fontWeight: '800', fontSize: 13 },
  settingsDescription: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border },
  backButton: { width: 35, height: 42, alignItems: 'flex-start', justifyContent: 'center', marginRight: 3 },
  backGlyph: { color: palette.text, fontSize: 38, lineHeight: 42, marginTop: -4 },
  chatHeaderTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  onlineLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { color: palette.muted, fontSize: 10 },
  iconButton: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center' },
  moreGlyph: { color: palette.muted, fontSize: 23, letterSpacing: 1 },
  demoNotice: { backgroundColor: '#211F37', paddingVertical: 8, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#40365E' },
  demoNoticeText: { color: '#BEB3EF', fontSize: 10, textAlign: 'center' },
  messageList: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' },
  emptyMessages: { alignItems: 'center', alignSelf: 'center', marginVertical: 45, maxWidth: 240 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 5, gap: 8 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowTheirs: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 },
  messageBubbleMine: { backgroundColor: '#5B4C9B', borderBottomRightRadius: 6 },
  messageBubbleTheirs: { backgroundColor: palette.bubble, borderBottomLeftRadius: 6 },
  messageSender: { color: '#C8BCFF', fontWeight: '800', fontSize: 10, marginBottom: 4 },
  messageText: { color: palette.text, fontSize: 13, lineHeight: 19 },
  messageTime: { alignSelf: 'flex-end', color: '#9698B3', fontSize: 9, marginTop: 5 },
  messageTimeMine: { color: '#D8D0FF' },
  composerArea: { borderTopColor: palette.border, borderTopWidth: 1, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 8, backgroundColor: palette.bg },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 17, paddingLeft: 13, paddingRight: 6, paddingVertical: 6 },
  composerInput: { flex: 1, color: palette.text, fontSize: 13, maxHeight: 110, minHeight: 38, paddingTop: 9, paddingBottom: 8 },
  sendButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  sendButtonDisabled: { backgroundColor: '#34334A' },
  sendGlyph: { color: '#171326', fontSize: 18, fontWeight: '900', marginLeft: 1 },
  composerHint: { color: '#747793', fontSize: 9, textAlign: 'center', marginTop: 7 },
})
