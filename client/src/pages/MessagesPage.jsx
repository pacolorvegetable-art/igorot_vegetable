import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { getCustomers } from '../services/customerService'
import {
  getConversationMessages,
  getConversationsForCustomer,
  getConversationsForSeller,
  getOrCreateConversation,
  getUnreadConversationCounts,
  markConversationAsRead,
  sendConversationMessage
} from '../services/messageService'

const formatMessageTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

const formatThreadTime = (value) => {
  if (!value) return 'No messages yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No messages yet'

  const now = new Date()
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const sortConversations = (items) => {
  return [...items].sort((firstItem, secondItem) => {
    const firstTime = new Date(firstItem.last_message_at || firstItem.created_at || 0).getTime()
    const secondTime = new Date(secondItem.last_message_at || secondItem.created_at || 0).getTime()
    return secondTime - firstTime
  })
}

export function MessagesWorkspace({ viewerRole }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draftMessage, setDraftMessage] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })
  const [showMobileList, setShowMobileList] = useState(true)
  const bottomAnchorRef = useRef(null)

  const conversationParam = searchParams.get('conversation')
  const sellerParam = searchParams.get('seller')
  const customerParam = searchParams.get('customer')

  const isSellerView = viewerRole === 'staff'

  const loadConversations = useCallback(async (preferredConversationId = null) => {
    if (!user?.id) return

    try {
      setLoadingConversations(true)
      const nextConversations = isSellerView
        ? await getConversationsForSeller(user.id)
        : await getConversationsForCustomer(user.id)

      const sortedConversations = sortConversations(nextConversations)
      setConversations(sortedConversations)

      setActiveConversationId((currentConversationId) => {
        const preferredId = preferredConversationId || conversationParam || currentConversationId
        if (preferredId && sortedConversations.some((item) => item.id === preferredId)) {
          return preferredId
        }

        return sortedConversations[0]?.id || null
      })
    } catch (error) {
      console.error('Failed to load conversations:', error)
      toast.error('Failed to load messages')
      setConversations([])
      setActiveConversationId(null)
    } finally {
      setLoadingConversations(false)
    }
  }, [conversationParam, isSellerView, user?.id])

  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id) return

    try {
      const nextCounts = await getUnreadConversationCounts(user.id)
      setUnreadCounts(nextCounts)
    } catch (error) {
      console.error('Failed to load unread counts:', error)
    }
  }, [user?.id])

  const loadCustomers = useCallback(async () => {
    if (!isSellerView) return

    try {
      setLoadingCustomers(true)
      const nextCustomers = await getCustomers()
      setCustomers(nextCustomers || [])
    } catch (error) {
      console.error('Failed to load customers for messaging:', error)
      toast.error('Failed to load customers')
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }, [isSellerView])

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [activeConversationId, conversations]
  )

  const activeConversationPartnerLabel = useMemo(() => {
    if (!activeConversation) return ''
    return isSellerView
      ? activeConversation.customer_name || 'Customer'
      : activeConversation.seller_name || 'Seller'
  }, [activeConversation, isSellerView])

  const loadMessagesForConversation = useCallback(async (conversationId) => {
    if (!conversationId || !user?.id) {
      setMessages([])
      return
    }

    try {
      setLoadingMessages(true)
      const nextMessages = await getConversationMessages(conversationId)
      setMessages(nextMessages || [])
      await markConversationAsRead({ conversationId, userId: user.id })
      setMessages((currentMessages) => (
        currentMessages.map((message) => (
          message.receiver_id === user.id ? { ...message, is_read: true } : message
        ))
      ))
      await loadUnreadCounts()
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load conversation')
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [loadUnreadCounts, user?.id])

  useEffect(() => {
    if (!user?.id) return
    loadConversations()
    loadUnreadCounts()
  }, [loadConversations, loadUnreadCounts, user?.id])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    if (!conversationParam) return

    setActiveConversationId((currentConversationId) => (
      currentConversationId === conversationParam ? currentConversationId : conversationParam
    ))
  }, [conversationParam])

  useEffect(() => {
    const syncFromQuery = async () => {
      if (!user?.id) return

      try {
        if (!isSellerView && sellerParam) {
          const conversation = await getOrCreateConversation({
            customerId: user.id,
            sellerId: sellerParam
          })

          const nextSearchParams = new URLSearchParams(searchParams)
          nextSearchParams.delete('seller')
          nextSearchParams.set('conversation', conversation.id)
          setSearchParams(nextSearchParams)

          await loadConversations(conversation.id)
          return
        }

        if (isSellerView && customerParam) {
          const conversation = await getOrCreateConversation({
            customerId: customerParam,
            sellerId: user.id
          })

          const nextSearchParams = new URLSearchParams(searchParams)
          nextSearchParams.delete('customer')
          nextSearchParams.set('conversation', conversation.id)
          setSearchParams(nextSearchParams)

          await loadConversations(conversation.id)
        }
      } catch (error) {
        console.error('Failed to resolve conversation from query params:', error)
        toast.error('Could not open selected conversation')
      }
    }

    syncFromQuery()
  }, [
    customerParam,
    isSellerView,
    loadConversations,
    searchParams,
    sellerParam,
    setSearchParams,
    user?.id
  ])

  useEffect(() => {
    loadMessagesForConversation(activeConversationId)
  }, [activeConversationId, loadMessagesForConversation])

  useEffect(() => {
    if (!bottomAnchorRef.current) return
    bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleMediaChange = (event) => {
      setIsDesktop(event.matches)
      if (event.matches) {
        setShowMobileList(true)
      }
    }

    handleMediaChange(mediaQuery)
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`messages-${viewerRole}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation' },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message' },
        async ({ new: newMessage }) => {
          if (newMessage?.conversation_id === activeConversationId) {
            setMessages((currentMessages) => {
              const exists = currentMessages.some((item) => item.id === newMessage.id)
              if (exists) return currentMessages
              return [...currentMessages, newMessage]
            })

            if (newMessage.receiver_id === user.id) {
              await markConversationAsRead({ conversationId: activeConversationId, userId: user.id })
              setMessages((currentMessages) => (
                currentMessages.map((item) => (
                  item.receiver_id === user.id ? { ...item, is_read: true } : item
                ))
              ))
            }
          }

          loadConversations()
          loadUnreadCounts()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'message' },
        ({ new: updatedMessage }) => {
          if (updatedMessage?.conversation_id === activeConversationId) {
            setMessages((currentMessages) => (
              currentMessages.map((item) => (
                item.id === updatedMessage.id ? { ...item, ...updatedMessage } : item
              ))
            ))
          }

          loadUnreadCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    activeConversationId,
    loadConversations,
    loadUnreadCounts,
    user?.id,
    viewerRole
  ])

  const startConversationWithCustomer = async (customerId) => {
    if (!isSellerView || !user?.id || !customerId) return

    try {
      const conversation = await getOrCreateConversation({
        customerId,
        sellerId: user.id
      })

      await loadConversations(conversation.id)

      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('conversation', conversation.id)
      setSearchParams(nextSearchParams)

      if (!isDesktop) {
        setShowMobileList(false)
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast.error('Could not start conversation')
    }
  }

  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId)

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('conversation', conversationId)
    setSearchParams(nextSearchParams)

    if (!isDesktop) {
      setShowMobileList(false)
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    const trimmedMessage = draftMessage.trim()
    if (!trimmedMessage || !activeConversation || !user?.id) return

    try {
      setSendingMessage(true)
      const receiverId = isSellerView
        ? activeConversation.customer_id
        : activeConversation.seller_id

      const sentMessage = await sendConversationMessage({
        conversationId: activeConversation.id,
        senderId: user.id,
        receiverId,
        content: trimmedMessage
      })

      setDraftMessage('')
      setMessages((currentMessages) => {
        const exists = currentMessages.some((item) => item.id === sentMessage.id)
        if (exists) return currentMessages
        return [...currentMessages, sentMessage]
      })

      setConversations((currentConversations) => {
        const nextConversations = currentConversations.map((item) => (
          item.id === activeConversation.id
            ? {
              ...item,
              last_message_at: sentMessage.created_at,
              last_message_preview: sentMessage.content,
              last_message_sender_id: sentMessage.sender_id
            }
            : item
        ))

        return sortConversations(nextConversations)
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Message failed to send')
    } finally {
      setSendingMessage(false)
    }
  }

  const searchValue = searchQuery.trim().toLowerCase()

  const customerThreads = useMemo(() => {
    if (isSellerView) return []

    return conversations.filter((conversation) => {
      if (!searchValue) return true

      return (conversation.seller_name || 'seller').toLowerCase().includes(searchValue)
    })
  }, [conversations, isSellerView, searchValue])

  const sellerConversationMap = useMemo(() => {
    const map = new Map()

    for (const conversation of conversations) {
      map.set(conversation.customer_id, conversation)
    }

    return map
  }, [conversations])

  const sellerActiveThreads = useMemo(() => {
    if (!isSellerView) return []

    return conversations.filter((conversation) => {
      if (!searchValue) return true
      return (conversation.customer_name || 'customer').toLowerCase().includes(searchValue)
    })
  }, [conversations, isSellerView, searchValue])

  const sellerStartableCustomers = useMemo(() => {
    if (!isSellerView) return []

    return customers.filter((customer) => {
      const alreadyHasConversation = sellerConversationMap.has(customer.id)
      if (alreadyHasConversation) return false

      if (!searchValue) return true
      return (customer.name || customer.email || '').toLowerCase().includes(searchValue)
    })
  }, [customers, isSellerView, searchValue, sellerConversationMap])

  const hasConversations = conversations.length > 0
  const isChatPanelVisible = isDesktop || !showMobileList
  const isSidebarVisible = isDesktop || showMobileList

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSellerView
            ? 'Chat with customers and respond in real-time.'
            : 'Contact the seller and manage your conversations.'}
        </p>
      </div>

      <div className="grid min-h-[70vh] gap-0 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
        <aside className={`${isSidebarVisible ? 'block' : 'hidden'} border-r border-border bg-card md:block`}>
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isSellerView ? 'Search customer name...' : 'Search seller...'}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-[calc(70vh-64px)] overflow-y-auto p-2">
            {loadingConversations || loadingCustomers ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : !hasConversations && !isSellerView ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No conversations yet. Start by messaging a seller from a product.
              </div>
            ) : (
              <div className="space-y-2">
                {isSellerView ? (
                  <>
                    {sellerActiveThreads.map((conversation) => {
                      const isActive = activeConversationId === conversation.id
                      const unreadCount = unreadCounts[conversation.id] || 0

                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => handleSelectConversation(conversation.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {conversation.customer_name || 'Customer'}
                            </p>
                            <div className="flex items-center gap-1">
                              {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                              <span className="text-[11px] text-muted-foreground">
                                {formatThreadTime(conversation.last_message_at || conversation.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {conversation.last_message_preview || 'No messages yet'}
                          </p>
                        </button>
                      )
                    })}

                    {sellerStartableCustomers.length > 0 && (
                      <div className="pt-2">
                        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Start New
                        </p>
                        {sellerStartableCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => startConversationWithCustomer(customer.id)}
                            className="mb-2 w-full rounded-lg border border-dashed border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                          >
                            <p className="truncate text-sm font-semibold text-foreground">
                              {customer.name || 'Customer'}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              Start a new conversation
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {!searchValue && sellerActiveThreads.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        No active conversations yet.
                      </div>
                    )}
                  </>
                ) : (
                  customerThreads.map((conversation) => {
                    const isActive = activeConversationId === conversation.id
                    const unreadCount = unreadCounts[conversation.id] || 0

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`truncate text-sm ${unreadCount > 0 ? 'font-semibold' : 'font-medium'} text-foreground`}>
                            {conversation.seller_name || 'Seller'}
                          </p>
                          <div className="flex items-center gap-1">
                            {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                            <span className="text-[11px] text-muted-foreground">
                              {formatThreadTime(conversation.last_message_at || conversation.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {conversation.last_message_preview || 'No messages yet'}
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        <section className={`${isChatPanelVisible ? 'flex' : 'hidden'} min-h-[70vh] flex-col md:flex`}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setShowMobileList(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {activeConversationPartnerLabel || 'Select a conversation'}
              </p>
              {activeConversation && (
                <p className="text-xs text-muted-foreground">
                  {isSellerView ? 'Customer chat' : 'Seller chat'}
                </p>
              )}
            </div>
          </div>

          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {isSellerView
                ? 'Pick a customer from the sidebar to start chatting.'
                : 'Choose a seller conversation from the left panel.'}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading chat...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-foreground border border-border'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <p
                            className={`mt-1 text-[11px] ${
                              isOwnMessage ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomAnchorRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-border bg-card p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder="Type your message..."
                    className="max-h-32 min-h-[44px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !draftMessage.trim()}
                    className="inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function MessagesPage({ viewerRole = 'customer' }) {
  const isSellerView = viewerRole === 'staff'

  if (isSellerView) {
    return (
      <DashboardLayout>
        <MessagesWorkspace viewerRole="staff" />
      </DashboardLayout>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <h1 className="text-base font-semibold text-foreground sm:text-lg">Messages</h1>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/public-shop" className="text-muted-foreground transition-colors hover:text-foreground">
              Shop
            </Link>
            <span className="text-foreground">Messages</span>
            <Link to="/account" className="text-muted-foreground transition-colors hover:text-foreground">
              Account
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <MessagesWorkspace viewerRole="customer" />
      </div>
    </div>
  )
}
