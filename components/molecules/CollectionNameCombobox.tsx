'use client'

import { lazy, Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import Typography from '@mui/material/Typography'
import { Button } from '@atoms/Button'

import { SearchEntityBox } from '@molecules/SearchEntityBox'
import type { CollectionProposal } from 'types/collections'

const AddCollectionDialog = lazy(async () => ({
  default: (await import('@organisms/AddCollectionDialog')).AddCollectionDialog,
}))

interface CollectionOption {
  name: string
  tagId?: string
  isNew?: boolean
}

interface CollectionNameComboboxProps {
  value: string
  proposal: CollectionProposal | null
  onChange: (value: string) => void
  onProposalChange: (proposal: CollectionProposal | null) => void
  onValidityChange: (isValid: boolean) => void
}

export function CollectionNameCombobox({
  value,
  proposal,
  onChange,
  onProposalChange,
  onValidityChange,
}: CollectionNameComboboxProps): ReactElement {
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCollections(): Promise<void> {
      try {
        const response = await fetch('/api/collections/options', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Unable to load existing collections.')
        }
        const payload = (await response.json()) as { collections: CollectionOption[] }
        setCollections(payload.collections)
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return
        }
        setError('Unable to load existing collections. Try again later or create a new collection.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadCollections()
    return () => controller.abort()
  }, [])

  const options = useMemo<CollectionOption[]>(() => {
    const query = value.trim().toLowerCase()
    const matches: CollectionOption[] = collections.filter((collection) =>
      collection.name.toLowerCase().includes(query),
    )
    if (query && !proposal && !collections.some((collection) => collection.name.trim().toLowerCase() === query)) {
      matches.push({ name: value.trim(), isNew: true })
    }
    return matches
  }, [collections, proposal, value])
  const isExisting = collections.some(
    (collection) => collection.name.trim().toLowerCase() === value.trim().toLowerCase(),
  )
  const isProposed = proposal?.name === value.trim()

  useEffect(() => {
    onValidityChange(!value.trim() || Boolean(isProposed) || (!loading && isExisting))
  }, [isExisting, isProposed, loading, onValidityChange, value])

  function selectName(name: string): void {
    const existing = collections.find(
      (collection) => collection.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
    if (existing) {
      onProposalChange(null)
      onChange(existing.name)
    } else {
      setNewCollectionName(name.trim())
    }
  }

  return (
    <>
      <SearchEntityBox<CollectionOption>
        inputValue={value}
        options={options}
        loading={loading}
        disabled={newCollectionName !== null}
        label={'Collection Name'}
        placeholder={'Search or enter a new collection'}
        helperText={
          isProposed
            ? 'This proposed collection will be created when the batch is processed.'
            : (error ?? 'Select an existing collection or propose a new one using the Add Collection dialog.')
        }
        onInputChange={(nextValue) => {
          if (proposal && nextValue.trim() !== proposal.name) onProposalChange(null)
          onChange(nextValue)
        }}
        onSelectOption={(option) => selectName(option.name)}
        onSelectFreeText={selectName}
        getOptionLabel={(option) => option.name}
        getOptionKey={(option) => `${option.isNew ? 'new' : option.tagId}:${option.name}`}
        renderOption={(option) => (
          <Typography component={'span'} variant={'body2'}>
            {option.isNew ? `Create new collection "${option.name}"` : option.name}
          </Typography>
        )}
      />
      {isProposed && proposal ? (
        <Button variant={'ghost'} onClick={() => setNewCollectionName(proposal.name)}>
          {'Edit proposed collection'}
        </Button>
      ) : null}
      {newCollectionName !== null ? (
        <Suspense fallback={null}>
          <AddCollectionDialog
            open
            initialName={newCollectionName}
            initialProposal={proposal?.name === newCollectionName ? proposal : null}
            collections={collections.flatMap((collection) =>
              collection.tagId ? [{ tag_id: collection.tagId, collection_name: collection.name }] : [],
            )}
            onClose={() => setNewCollectionName(null)}
            onProposalSaved={(nextProposal) => {
              onProposalChange(nextProposal)
              onChange(nextProposal.name)
            }}
          />
        </Suspense>
      ) : null}
    </>
  )
}
