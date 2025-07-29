'use client'

export const RelationshipDescription = () => {
  return (
    <div style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#555' }}>
      <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
        <li>
          Currently, you <strong>cannot add or delete</strong> items from this select relationship
          directly.
        </li>
        <li>
          Changes made here will be <strong>overwritten</strong> by the array.
        </li>
        <li>
          To <strong>add new items</strong>, use the associated <strong>array</strong> field
          instead.
        </li>
        {/* <li>
          If you need to manage a separate relationship, use a{' '}
          <strong>different field object with a unique name</strong>.
        </li> */}
      </ul>
    </div>
  )
}
